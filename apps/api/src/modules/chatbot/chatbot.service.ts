import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { limitedModeText, systemPrompt } from "./chatbot.prompts.js";
import { geminiProvider, type ProviderMessage, type ProviderToolCall } from "./chatbot.provider.js";
import { executeChatTool, type ChatToolContext } from "./chat.tools.js";

const defaultPolicy = {
  dailyBudgetMicroUsd: 350_000,
  monthlyBudgetMicroUsd: 8_000_000,
  inputCostMicroUsdPerMillionTokens: 1_000_000,
  outputCostMicroUsdPerMillionTokens: 5_000_000,
  demoMode: false,
};
const policySchema = z.object({
  dailyBudgetMicroUsd: z.number().int().min(10_000).max(100_000_000),
  monthlyBudgetMicroUsd: z.number().int().min(100_000).max(1_000_000_000),
  inputCostMicroUsdPerMillionTokens: z.number().int().min(0).max(100_000_000),
  outputCostMicroUsdPerMillionTokens: z.number().int().min(0).max(100_000_000),
  demoMode: z.boolean(),
});

export type ChatPolicy = z.infer<typeof policySchema>;
export type ChatContactDetails = { name: string; phone: string };
export type ChatOrderVerification = { code: string; phoneLast4: string };

export function redactPersonalData(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email đã ẩn]")
    .replace(/(?:tôi tên là|tên tôi là|my name is)\s+[^,.!?\n]{2,80}/gi, "[tên đã ẩn]")
    .replace(/(?:địa chỉ|address)\s*[:：]?\s*[^.!?\n,;]{5,120}/gi, "[địa chỉ đã ẩn]")
    .replace(/(?:số nhà|nhà số)\s*\d+[^.!?\n,;]{0,100}/gi, "[địa chỉ đã ẩn]")
    .replace(/(?:ở|tại|đến|giao tới)\s+(?:số\s*)?\d{1,5}(?!\s*(?:m(?:2|²|ét)?|lumen|w|kw)\b)[^.!?\n,;]{5,100}/gi, "[địa chỉ đã ẩn]")
    .replace(/(?:\+?84|0)[\s().-]?(?:\d[\s().-]?){8,10}/g, "[số điện thoại đã ẩn]");
}

export async function getChatPolicy(): Promise<ChatPolicy> {
  const setting = await prisma.setting.findUnique({ where: { key: "chatbot_policy" }, select: { value: true } });
  const parsed = policySchema.safeParse(setting?.value);
  return parsed.success ? parsed.data : defaultPolicy;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function monthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getAiUsage() {
  const [today, month] = await Promise.all([
    prisma.aiUsage.findUnique({ where: { day: todayUtc() }, select: { tokens: true, estCostMicroUsd: true } }),
    prisma.aiUsage.aggregate({ where: { day: { gte: monthUtc() } }, _sum: { tokens: true, estCostMicroUsd: true } }),
  ]);
  return {
    today: { tokens: today?.tokens ?? 0n, estCostMicroUsd: today?.estCostMicroUsd ?? 0n },
    month: { tokens: month._sum.tokens ?? 0n, estCostMicroUsd: month._sum.estCostMicroUsd ?? 0n },
  };
}

function estimateCost(inputTokens: number, outputTokens: number, policy: ChatPolicy): number {
  return Math.ceil((inputTokens * policy.inputCostMicroUsdPerMillionTokens + outputTokens * policy.outputCostMicroUsdPerMillionTokens) / 1_000_000);
}

function limitFor(policy: ChatPolicy): number {
  return policy.demoMode ? policy.dailyBudgetMicroUsd * 5 : policy.dailyBudgetMicroUsd;
}

async function reserveBudget(policy: ChatPolicy, reserveMicroUsd: number): Promise<Date | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(781245901)`;
    const day = todayUtc();
    const [today, month] = await Promise.all([
      tx.aiUsage.findUnique({ where: { day }, select: { estCostMicroUsd: true } }),
      tx.aiUsage.aggregate({ where: { day: { gte: monthUtc() } }, _sum: { estCostMicroUsd: true } }),
    ]);
    const dailyLimit = limitFor(policy);
    const monthlyLimit = policy.demoMode ? policy.monthlyBudgetMicroUsd * 2 : policy.monthlyBudgetMicroUsd;
    if (Number(today?.estCostMicroUsd ?? 0n) + reserveMicroUsd > dailyLimit
      || Number(month._sum.estCostMicroUsd ?? 0n) + reserveMicroUsd > monthlyLimit) return null;
    await tx.aiUsage.upsert({
      where: { day },
      create: { day, tokens: 0n, estCostMicroUsd: BigInt(reserveMicroUsd) },
      update: { estCostMicroUsd: { increment: BigInt(reserveMicroUsd) } },
    });
    return day;
  });
}

async function settleBudget(day: Date, inputTokens: number, outputTokens: number, reservedMicroUsd: number, actualMicroUsd: number) {
  await prisma.aiUsage.update({
    where: { day },
    data: {
      tokens: { increment: BigInt(inputTokens + outputTokens) },
      estCostMicroUsd: { increment: BigInt(actualMicroUsd - reservedMicroUsd) },
    },
  });
}

function buildContext(policy: ChatPolicy, input: { orderVerification?: ChatOrderVerification; contactDetails?: ChatContactDetails }): string {
  let context = systemPrompt;
  if (policy.demoMode) context += "\nChế độ demo đang bật.";
  if (input.orderVerification) context += `\nKhách đã gửi xác minh tra đơn cho mã ${input.orderVerification.code}. Chỉ dùng xác minh này nếu khách đang hỏi đúng đơn đó.`;
  if (input.contactDetails) context += "\nKhách đã nhập thông tin liên hệ riêng trong form; chỉ tạo yêu cầu liên hệ khi khách yêu cầu.";
  return context;
}

function maxBudgetFromMessage(message: string): number | undefined {
  const match = message.match(/(?:dưới|tối đa|không quá|ngân sách(?: là)?|budget(?: of)?)[^0-9]{0,20}([\d.]+(?:,\d+)?)\s*(triệu|tr|k|nghìn|ngàn|đ|vnd)?/i);
  if (!match?.[1]) return undefined;
  const amount = Number(match[1].replaceAll(".", "").replace(",", "."));
  if (!Number.isFinite(amount)) return undefined;
  const unit = match[2]?.toLowerCase();
  const multiplier = unit === "triệu" || unit === "tr" ? 1_000_000 : unit === "k" || unit === "nghìn" || unit === "ngàn" ? 1_000 : unit ? 1 : amount < 1000 ? 1 : 1;
  const value = Math.floor(amount * multiplier);
  return value > 0 && value <= 1_000_000_000 ? value : undefined;
}

async function limitedProductAnswer(context: ChatToolContext, message: string): Promise<string> {
  if (!/(?:đèn|den|sản phẩm|san pham|mẫu|mau|mua|tìm|tim|lamp|light)/i.test(message)) return limitedModeText;
  try {
    const maxPrice = maxBudgetFromMessage(message);
    const result = await executeChatTool("search_products", { limit: 3, ...(maxPrice === undefined ? {} : { maxPrice }) }, context) as { products?: Array<{ name: string; minPriceVnd: number; slug: string }> };
    const products = result.products ?? [];
    if (!products.length) return `${limitedModeText}\nHiện chưa tìm thấy sản phẩm phù hợp trong danh sách đang bán${maxPrice === undefined ? "." : " trong ngân sách bạn nêu."}`;
    const lines = products.map((product) => `- ${product.name} (từ ${new Intl.NumberFormat("vi-VN").format(product.minPriceVnd)} ₫, mã ${product.slug})`);
    return `${limitedModeText}\nMột vài sản phẩm đang bán:\n${lines.join("\n")}`;
  } catch {
    return limitedModeText;
  }
}

function providerHistory(messages: Array<{ role: "USER" | "ASSISTANT" | "TOOL"; content: string }>): ProviderMessage[] {
  return messages.flatMap((message) => message.role === "TOOL" ? [] : [{ role: message.role === "USER" ? "user" as const : "model" as const, parts: [{ text: message.content }] }]);
}

async function executeCalls(calls: ProviderToolCall[], context: ChatToolContext) {
  const callLog: Array<{ name: string; args: unknown; result: unknown }> = [];
  const responses: Array<Record<string, unknown>> = [];
  for (const call of calls) {
    try {
      const result = await executeChatTool(call.name, call.args, context);
      callLog.push({ name: call.name, args: call.args, result });
      responses.push({ functionResponse: { name: call.name, response: { result } } });
    } catch (error) {
      const message = error instanceof z.ZodError ? "Tham số tool không hợp lệ." : "Không thể hoàn thành thao tác tra cứu.";
      const result = { error: message };
      callLog.push({ name: call.name, args: call.args, result });
      responses.push({ functionResponse: { name: call.name, response: result } });
    }
  }
  return { callLog, responses };
}

export async function generateChatAnswer(input: {
  message: string;
  history: Array<{ role: "USER" | "ASSISTANT" | "TOOL"; content: string }>;
  context: ChatToolContext;
  policy: ChatPolicy;
}): Promise<{ answer: string; limitedMode: boolean; tokensIn: number; tokensOut: number; toolCalls: unknown[] }> {
  if (env.AI_PROVIDER !== "gemini" || !env.GEMINI_API_KEY) {
    return { answer: await limitedProductAnswer(input.context, input.message), limitedMode: true, tokensIn: 0, tokensOut: 0, toolCalls: [] };
  }

  const contents = providerHistory(input.history);
  const toolCalls: unknown[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  const roomTypes = await prisma.lightingRule.findMany({ select: { roomType: true }, orderBy: { roomType: "asc" } });
  const system = `${buildContext(input.policy, input.context)}\nCác roomType hợp lệ để gọi calculate_lighting: ${roomTypes.map(({ roomType }) => roomType).join(", ") || "chưa có cấu hình"}.`;
  let toolCallCount = 0;
  for (let turn = 0; turn < 5; turn += 1) {
    const estimatedInput = Math.ceil((system.length + contents.reduce((size, item) => size + JSON.stringify(item).length, 0)) / 3.5);
    const reserve = estimateCost(estimatedInput * 2, 700, input.policy);
    const reservedDay = await reserveBudget(input.policy, reserve);
    if (!reservedDay) {
      return { answer: await limitedProductAnswer(input.context, input.message), limitedMode: true, tokensIn: totalInput, tokensOut: totalOutput, toolCalls };
    }
    let reservationSettled = false;
    try {
      const result = await geminiProvider.chat({ system, contents });
      totalInput += result.inputTokens;
      totalOutput += result.outputTokens;
      reservationSettled = true;
      await settleBudget(reservedDay, result.inputTokens, result.outputTokens, reserve, estimateCost(result.inputTokens, result.outputTokens, input.policy));
      if (result.blocked) return { answer: "Tôi chưa thể xử lý nội dung này. Bạn có thể hỏi về sản phẩm, ánh sáng, đơn hàng hoặc chính sách của cửa hàng.", limitedMode: false, tokensIn: totalInput, tokensOut: totalOutput, toolCalls };
      if (result.calls.length === 0) {
        if (result.text) return { answer: result.text, limitedMode: false, tokensIn: totalInput, tokensOut: totalOutput, toolCalls };
        return { answer: "Tôi chưa có câu trả lời phù hợp. Bạn có thể diễn đạt cụ thể hơn hoặc liên hệ nhân viên.", limitedMode: false, tokensIn: totalInput, tokensOut: totalOutput, toolCalls };
      }
      const remainingCalls = 4 - toolCallCount;
      const acceptedCalls = result.calls.slice(0, remainingCalls);
      if (acceptedCalls.length === 0) return { answer: await limitedProductAnswer(input.context, input.message), limitedMode: true, tokensIn: totalInput, tokensOut: totalOutput, toolCalls };
      toolCallCount += acceptedCalls.length;
      contents.push({ role: "model", parts: acceptedCalls.map((call) => ({ functionCall: { name: call.name, args: call.args } })) });
      const executed = await executeCalls(acceptedCalls, input.context);
      toolCalls.push(...executed.callLog);
      contents.push({ role: "user", parts: executed.responses });
    } catch (error) {
      if (!reservationSettled) await settleBudget(reservedDay, 0, 0, reserve, 0);
      const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: number }).status : undefined;
      if (status === 429 || status === 503 || error instanceof Error) {
        return { answer: await limitedProductAnswer(input.context, input.message), limitedMode: true, tokensIn: totalInput, tokensOut: totalOutput, toolCalls };
      }
      throw error;
    }
  }
  return { answer: await limitedProductAnswer(input.context, input.message), limitedMode: true, tokensIn: totalInput, tokensOut: totalOutput, toolCalls };
}

export async function saveChatMessages(input: {
  sessionId: string;
  userMessage: string;
  answer: string;
  toolCalls: unknown[];
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}) {
  const safeCalls = redactPersonalData(JSON.stringify(input.toolCalls));
  return prisma.$transaction(async (tx) => {
    await tx.chatMessage.create({ data: { sessionId: input.sessionId, role: "USER", content: redactPersonalData(input.userMessage) } });
    return tx.chatMessage.create({
      data: {
        sessionId: input.sessionId,
        role: "ASSISTANT",
        content: redactPersonalData(input.answer),
        toolCalls: safeCalls === "[]" ? Prisma.JsonNull : JSON.parse(safeCalls) as Prisma.InputJsonValue,
        tokensIn: input.tokensIn,
        tokensOut: input.tokensOut,
        latencyMs: input.latencyMs,
      },
      select: { id: true },
    });
  });
}
