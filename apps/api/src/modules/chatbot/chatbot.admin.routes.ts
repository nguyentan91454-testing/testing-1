import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { recordAdminChange } from "../admin/admin-audit.js";
import { getAiUsage, getChatPolicy } from "./chatbot.service.js";

export const chatbotAdminRouter = Router();

chatbotAdminRouter.get("/chatbot/usage", async (_request, response, next) => {
  try {
    const [policy, usage] = await Promise.all([getChatPolicy(), getAiUsage()]);
    response.json({ success: true, data: {
      policy,
      usage: {
        today: { tokens: usage.today.tokens.toString(), estCostMicroUsd: usage.today.estCostMicroUsd.toString() },
        month: { tokens: usage.month.tokens.toString(), estCostMicroUsd: usage.month.estCostMicroUsd.toString() },
      },
      provider: process.env.AI_PROVIDER ?? "mock",
    } });
  } catch (error) { next(error); }
});

chatbotAdminRouter.put("/chatbot/settings", async (request, response, next) => {
  try {
    const input = z.object({
      dailyBudgetMicroUsd: z.number().int().min(10_000).max(100_000_000),
      monthlyBudgetMicroUsd: z.number().int().min(100_000).max(1_000_000_000),
      inputCostMicroUsdPerMillionTokens: z.number().int().min(0).max(100_000_000),
      outputCostMicroUsdPerMillionTokens: z.number().int().min(0).max(100_000_000),
      demoMode: z.boolean(),
    }).refine((value) => value.dailyBudgetMicroUsd <= value.monthlyBudgetMicroUsd, { message: "Daily budget must not exceed monthly budget" }).parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.setting.findUnique({ where: { key: "chatbot_policy" } });
      const updated = await tx.setting.upsert({ where: { key: "chatbot_policy" }, create: { key: "chatbot_policy", value: input }, update: { value: input } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: before ? "CHATBOT_SETTINGS_UPDATED" : "CHATBOT_SETTINGS_CREATED", entity: "Setting", entityId: "chatbot_policy", before: before?.value, after: updated.value });
      return updated;
    });
    response.json({ success: true, data: result });
  } catch (error) { next(error); }
});

chatbotAdminRouter.get("/chatbot/sessions", async (request, response, next) => {
  try {
    const { page, limit } = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) }).parse(request.query);
    const [data, total] = await prisma.$transaction([
      prisma.chatSession.findMany({ orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit, select: { id: true, sessionId: true, userId: true, createdAt: true, updatedAt: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, role: true, feedback: true, createdAt: true } } } }),
      prisma.chatSession.count(),
    ]);
    response.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

chatbotAdminRouter.get("/chatbot/sessions/:sessionId", async (request, response, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { id: true, userId: true, createdAt: true, updatedAt: true, messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, toolCalls: true, tokensIn: true, tokensOut: true, latencyMs: true, feedback: true, createdAt: true } } } });
    if (!session) throw new HttpError(404, "Chat session not found", "CHAT_SESSION_NOT_FOUND");
    response.json({ success: true, data: session });
  } catch (error) { next(error); }
});

chatbotAdminRouter.get("/chatbot/contact-requests", async (request, response, next) => {
  try {
    const { page, limit, status } = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional() }).parse(request.query);
    const where = status ? { status } : {};
    const [data, total] = await prisma.$transaction([
      prisma.contactRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.contactRequest.count({ where }),
    ]);
    response.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

chatbotAdminRouter.patch("/chatbot/contact-requests/:requestId", async (request, response, next) => {
  try {
    const { requestId } = z.object({ requestId: z.string().uuid() }).parse(request.params);
    const { status } = z.object({ status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]) }).parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.contactRequest.findUnique({ where: { id: requestId } });
      if (!before) throw new HttpError(404, "Contact request not found", "CONTACT_REQUEST_NOT_FOUND");
      const updated = await tx.contactRequest.update({ where: { id: requestId }, data: { status } });
      await recordAdminChange(tx, { adminId: request.admin!.id, action: "CHAT_CONTACT_REQUEST_UPDATED", entity: "ContactRequest", entityId: requestId, before: { status: before.status }, after: { status: updated.status } });
      return updated;
    });
    response.json({ success: true, data: result });
  } catch (error) { next(error); }
});
