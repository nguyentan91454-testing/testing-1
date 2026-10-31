import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/env.js", () => ({ env: { GEMINI_API_KEY: "test-key", GEMINI_MODEL: "gemini-test" } }));
const { requestGemini } = await import("./chatbot.provider.js");

afterEach(() => vi.unstubAllGlobals());

describe("Gemini provider adapter", () => {
  it("parses function calls, usage metadata, and sends the fixed tool allowlist", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ functionCall: { name: "search_products", args: { limit: 2 } } }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGemini({ system: "system", contents: [{ role: "user", parts: [{ text: "đèn thả" }] }] });
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body)) as { tools: Array<{ functionDeclarations: Array<{ name: string }> }>; toolConfig: unknown };
    expect(result.calls).toEqual([{ name: "search_products", args: { limit: 2 } }]);
    expect(result.inputTokens).toBe(10);
    expect(body.tools[0]?.functionDeclarations).toHaveLength(7);
    expect(body.toolConfig).toBeDefined();
  });

  it("surfaces provider rate limits for the service fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    await expect(requestGemini({ system: "system", contents: [] })).rejects.toMatchObject({ status: 429 });
  });
});
