import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { config, logger, smtp } = vi.hoisted(() => ({
  config: { NODE_ENV: "development", API_BASE_URL: "http://localhost:4000", RESEND_API_KEY: "", GMAIL_USER: "", GMAIL_APP_PASSWORD: "", MAILPIT_SMTP_HOST: "127.0.0.1", MAILPIT_SMTP_PORT: 1025, EMAIL_FROM: "Shop <hello@example.test>", JWT_ACCESS_SECRET: "test-secret-at-least-32-characters-long" },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  smtp: { createTransport: vi.fn(), sendMail: vi.fn() },
}));
vi.mock("../../config/env.js", () => ({ env: config }));
vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));
vi.mock("../../lib/logger.js", () => ({ logger }));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.createTransport } }));
const { sendVerificationEmail } = await import("./email.service.js");
const input = { email: "customer@example.test", name: "Khách hàng", token: "signed-token" };
beforeEach(() => {
  vi.resetAllMocks();
  config.NODE_ENV = "development";
  config.RESEND_API_KEY = "";
  config.GMAIL_USER = "";
  config.GMAIL_APP_PASSWORD = "";
  smtp.createTransport.mockReturnValue({ sendMail: smtp.sendMail });
  smtp.sendMail.mockResolvedValue({ messageId: "smtp-message-id" });
});
afterEach(() => vi.unstubAllGlobals());
describe("verification email delivery", () => {
  it("delivers to Mailpit in development instead of claiming success after logging a token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendVerificationEmail(input);
    expect(smtp.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "127.0.0.1", port: 1025, secure: false }));
    expect(smtp.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: input.email, text: expect.stringContaining("http://localhost:4000/api/v1/auth/verify-email?token=signed-token") }));
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(input.token);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not log tokens or silently skip delivery in production", async () => {
    config.NODE_ENV = "production";
    await expect(sendVerificationEmail(input)).rejects.toMatchObject({ status: 503, code: "VERIFICATION_EMAIL_UNAVAILABLE" });
    expect(logger.info).not.toHaveBeenCalled();
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });
  it("prioritizes Gmail with TLS and the configured sender over Resend", async () => {
    config.GMAIL_USER = "sender@gmail.com";
    config.GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    config.RESEND_API_KEY = "fake-key";
    config.NODE_ENV = "production";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendVerificationEmail(input);
    expect(smtp.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: config.GMAIL_USER, pass: config.GMAIL_APP_PASSWORD } }));
    expect(smtp.sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: { name: "Konyappi Shop", address: config.GMAIL_USER }, to: input.email, text: expect.stringContaining("signed-token"), html: expect.stringContaining("signed-token") }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
  it("reports Gmail auth failures without silently falling back to a local mailbox", async () => {
    config.GMAIL_USER = "sender@gmail.com";
    config.GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    smtp.sendMail.mockRejectedValue(new Error("Invalid login"));
    await expect(sendVerificationEmail(input)).rejects.toMatchObject({ status: 503, code: "VERIFICATION_EMAIL_UNAVAILABLE" });
    expect(smtp.createTransport).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
  });
  it("does not claim delivery if the local SMTP server is unreachable", async () => {
    smtp.sendMail.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(sendVerificationEmail(input)).rejects.toMatchObject({ status: 503, code: "VERIFICATION_EMAIL_UNAVAILABLE" });
    expect(logger.info).not.toHaveBeenCalled();
  });
  it("sends both HTML and plain text through the existing Resend provider", async () => {
    config.RESEND_API_KEY = "fake-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-id" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendVerificationEmail(input);
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers).toMatchObject({ Authorization: "Bearer fake-key" });
    expect(JSON.parse(request.body as string)).toMatchObject({ to: [input.email], subject: expect.stringContaining("Xác minh"), html: expect.stringContaining("signed-token"), text: expect.stringContaining("24 giờ") });
    expect(logger.info).not.toHaveBeenCalled();
  });
  it("returns a recoverable Vietnamese error on a provider failure", async () => {
    config.RESEND_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider failure", { status: 500 })));
    await expect(sendVerificationEmail(input)).rejects.toMatchObject({ status: 503, code: "VERIFICATION_EMAIL_UNAVAILABLE", message: expect.stringContaining("gửi email") });
  });
});
