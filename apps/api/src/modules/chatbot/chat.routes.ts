import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { env } from "../../config/env.js";
import { optionalCustomer } from "../../http/customer-auth.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { containsPromptInjection, refusalText } from "./chatbot.prompts.js";
import { generateChatAnswer, getChatPolicy, redactPersonalData, saveChatMessages } from "./chatbot.service.js";

export const chatRouter = Router();
const sessionCookie = "chat_session";
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/v1/chat", maxAge: 30 * 24 * 60 * 60 * 1000 };
const chatIpLimiter = rateLimit({ windowMs: 24 * 60 * 60_000, limit: 80, standardHeaders: "draft-8", legacyHeaders: false });
const contactRequestLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 3, standardHeaders: "draft-8", legacyHeaders: false });
const orderLookupLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false, skip: (request) => !request.body?.orderVerification });
const sessionResetLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
const contactPhoneSchema = z.string().trim().transform((value) => {
  const compact = value.replace(/[\s()-]/g, "");
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
}).refine((value) => /^0\d{9,10}$/.test(value), "Số điện thoại Việt Nam không hợp lệ");

const messageSchema = z.object({
  message: z.string().trim().min(1).max(500),
  orderVerification: z.object({ code: z.string().trim().min(8).max(40), phoneLast4: z.string().regex(/^\d{4}$/) }).optional(),
  contactDetails: z.object({ name: z.string().trim().min(2).max(120), phone: contactPhoneSchema }).optional(),
});
const contactRequestSchema = z.object({ name: z.string().trim().min(2).max(120), phone: contactPhoneSchema, message: z.string().trim().min(5).max(1000) });

chatRouter.post("/contact-requests", contactRequestLimiter, async (request, response, next) => {
  try {
    const input = contactRequestSchema.parse(request.body);
    const contactRequest = await prisma.contactRequest.create({ data: input });
    response.status(201).json({ success: true, data: { id: contactRequest.id, status: contactRequest.status }, message: "Đã ghi nhận yêu cầu tư vấn." });
  } catch (error) { next(error); }
});

async function ensureChatSession(request: Request, response: Response) {
  let sessionId = request.cookies?.[sessionCookie] as string | undefined;
  let session = sessionId && /^[0-9a-f-]{36}$/i.test(sessionId)
    ? await prisma.chatSession.findUnique({ where: { sessionId } })
    : null;
  if (session && session.userId !== (request.customer?.id ?? null)) session = null;
  if (!session) {
    sessionId = randomUUID();
    session = await prisma.chatSession.create({ data: { sessionId, userId: request.customer?.id ?? null } });
    response.cookie(sessionCookie, sessionId, cookieOptions);
  }
  return session;
}

chatRouter.post("/session/reset", sessionResetLimiter, optionalCustomer, async (request, response, next) => {
  try {
    const sessionId = randomUUID();
    const session = await prisma.chatSession.create({ data: { sessionId, userId: request.customer?.id ?? null } });
    response.cookie(sessionCookie, sessionId, cookieOptions);
    response.status(201).json({ success: true, data: { sessionId: session.id } });
  } catch (error) { next(error); }
});

chatRouter.post("/messages", optionalCustomer, chatIpLimiter, orderLookupLimiter, async (request, response, next) => {
  try {
    const input = messageSchema.parse(request.body);
    const session = await ensureChatSession(request, response);
    const userMessageCount = await prisma.chatMessage.count({ where: { sessionId: session.id, role: "USER" } });
    if (userMessageCount >= 25) throw new HttpError(429, "Phiên chat đã đạt giới hạn tin nhắn. Hãy bắt đầu phiên mới.", "CHAT_SESSION_LIMIT");

    const startedAt = Date.now();
    const storedMessage = redactPersonalData(input.message);
    const history = await prisma.chatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "desc" }, take: 9, select: { role: true, content: true } });
    const context = {
      sessionId: session.id,
      ...(request.customer ? { customerId: request.customer.id } : {}),
      ...(input.orderVerification ? { orderVerification: { code: input.orderVerification.code, phoneLast4: input.orderVerification.phoneLast4 } } : {}),
      ...(input.contactDetails ? { contactDetails: input.contactDetails } : {}),
    };
    const policy = await getChatPolicy();
    const generated = containsPromptInjection(input.message)
      ? { answer: refusalText, limitedMode: false, tokensIn: 0, tokensOut: 0, toolCalls: [] }
      : await generateChatAnswer({
        message: storedMessage,
        history: [...history.reverse(), { role: "USER", content: storedMessage }],
        context,
        policy,
      });
    const latencyMs = Date.now() - startedAt;
    const savedAssistantMessage = await saveChatMessages({
      sessionId: session.id,
      userMessage: input.message,
      answer: generated.answer,
      toolCalls: generated.toolCalls,
      tokensIn: generated.tokensIn,
      tokensOut: generated.tokensOut,
      latencyMs,
    });
    const products = generated.toolCalls.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const call = entry as { name?: unknown; result?: unknown };
      if (!(["search_products", "recommend_products"].includes(String(call.name)))) return [];
      const result = call.result && typeof call.result === "object" ? call.result as { products?: unknown; product?: unknown } : {};
      const candidates = Array.isArray(result.products) ? result.products : result.product ? [result.product] : [];
      return candidates.flatMap((candidate) => {
        if (!candidate || typeof candidate !== "object") return [];
        const product = candidate as { id?: unknown; slug?: unknown; name?: unknown; minPriceVnd?: unknown; images?: unknown; variants?: unknown };
        if (typeof product.id !== "string" || typeof product.slug !== "string" || typeof product.name !== "string") return [];
        const image = Array.isArray(product.images) ? product.images[0] : null;
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const minVariantPrice = variants.reduce<number | null>((minimum, variant) => {
          if (!variant || typeof variant !== "object" || typeof (variant as { priceVnd?: unknown }).priceVnd !== "number") return minimum;
          const price = (variant as { priceVnd: number }).priceVnd;
          return minimum === null || price < minimum ? price : minimum;
        }, null);
        return [{
          id: product.id,
          slug: product.slug,
          name: product.name,
          priceVnd: minVariantPrice ?? (typeof product.minPriceVnd === "number" ? product.minPriceVnd : 0),
          image: image && typeof image === "object" && typeof (image as { url?: unknown }).url === "string" ? { url: (image as { url: string }).url, alt: typeof (image as { alt?: unknown }).alt === "string" ? (image as { alt: string }).alt : product.name } : null,
          variantId: variants.find((variant) => variant && typeof variant === "object" && typeof (variant as { id?: unknown }).id === "string") ? (variants.find((variant) => variant && typeof variant === "object" && typeof (variant as { id?: unknown }).id === "string") as { id: string }).id : null,
        }];
      });
    }).slice(0, 5);
    response.json({ success: true, data: { messageId: savedAssistantMessage.id, answer: generated.answer, limitedMode: generated.limitedMode, latencyMs, products } });
  } catch (error) { next(error); }
});

chatRouter.patch("/messages/:messageId/feedback", optionalCustomer, async (request, response, next) => {
  try {
    const { messageId } = z.object({ messageId: z.string().uuid() }).parse(request.params);
    const { feedback } = z.object({ feedback: z.union([z.literal(-1), z.literal(1)]) }).parse(request.body);
    const sessionId = request.cookies?.[sessionCookie] as string | undefined;
    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) throw new HttpError(404, "Không tìm thấy tin nhắn", "CHAT_MESSAGE_NOT_FOUND");
    const session = await prisma.chatSession.findUnique({ where: { sessionId } });
    if (!session || session.userId !== (request.customer?.id ?? null)) throw new HttpError(404, "Không tìm thấy tin nhắn", "CHAT_MESSAGE_NOT_FOUND");
    const updated = await prisma.chatMessage.updateMany({ where: { id: messageId, sessionId: session.id, role: "ASSISTANT" }, data: { feedback } });
    if (updated.count !== 1) throw new HttpError(404, "Không tìm thấy tin nhắn", "CHAT_MESSAGE_NOT_FOUND");
    response.json({ success: true, data: { messageId, feedback } });
  } catch (error) { next(error); }
});
