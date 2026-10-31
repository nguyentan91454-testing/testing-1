import { env } from "../../config/env.js";
import { z } from "zod";
import { chatToolDeclarations } from "./chat.tools.js";

export type ProviderMessage = { role: "user" | "model"; parts: Array<Record<string, unknown>> };
export type ProviderToolCall = { name: string; args: unknown };
export type ProviderResult = { text: string; calls: ProviderToolCall[]; inputTokens: number; outputTokens: number; blocked: boolean };
export interface AIProvider {
  chat(input: { system: string; contents: ProviderMessage[] }): Promise<ProviderResult>;
}

const responseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({ parts: z.array(z.object({
      text: z.string().optional(),
      functionCall: z.object({ name: z.string(), args: z.unknown() }).optional(),
    }).passthrough()) }).optional(),
    finishReason: z.string().optional(),
  }).passthrough()).optional(),
  usageMetadata: z.object({ promptTokenCount: z.number().int().nonnegative().optional(), candidatesTokenCount: z.number().int().nonnegative().optional() }).optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
}).passthrough();

export async function requestGemini(input: { system: string; contents: ProviderMessage[] }): Promise<ProviderResult> {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini provider is not configured");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: input.contents,
      tools: [{ functionDeclarations: chatToolDeclarations }],
      toolConfig: { functionCallingConfig: { mode: "AUTO", allowedFunctionNames: chatToolDeclarations.map(({ name }) => name) } },
      generationConfig: { maxOutputTokens: 700, temperature: 0.3 },
    }),
  });
  if (!response.ok) throw Object.assign(new Error(`Gemini request failed with status ${response.status}`), { status: response.status });
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Gemini returned an invalid response");
  const candidate = parsed.data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  return {
    text: parts.flatMap((part) => part.text ? [part.text] : []).join("\n").trim(),
    calls: parts.flatMap((part) => part.functionCall?.name ? [{ name: part.functionCall.name, args: part.functionCall.args }] : []),
    inputTokens: parsed.data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: parsed.data.usageMetadata?.candidatesTokenCount ?? 0,
    blocked: Boolean(parsed.data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY"),
  };
}

export const geminiProvider: AIProvider = { chat: requestGemini };
