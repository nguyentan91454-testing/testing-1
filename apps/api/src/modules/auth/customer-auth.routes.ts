import { randomBytes, randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { SignJWT } from "jose";
import { z } from "zod";
import { env } from "../../config/env.js";
import { customerCookieName, customerCookieOptions, requireCustomer } from "../../http/customer-auth.js";
import { HttpError } from "../../http/errors.js";
import { prisma } from "../../lib/prisma.js";
import { hashSessionToken, matchesOAuthState, readGoogleIdentity } from "./google-oauth.js";

const stateCookieName = "google_oauth_state";
const verifierCookieName = "google_oauth_verifier";
const nonceCookieName = "google_oauth_nonce";
const oauthCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth/google",
  maxAge: 10 * 60 * 1000,
};
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export const customerAuthRouter = Router();
const googleStartLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const googleCallbackLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });

function googleClient(): OAuth2Client | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${env.API_BASE_URL.replace(/\/$/, "")}/api/v1/auth/google/callback`;
  return new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);
}

function redirectToApp(response: Response, result: "success" | "cancelled") {
  const url = new URL(env.APP_BASE_URL);
  if (result === "success") url.searchParams.set("auth", "success");
  else url.searchParams.set("auth_error", "cancelled");
  response.redirect(url.toString());
}

function clearOAuthCookies(response: Response) {
  const clearOptions = { ...oauthCookieOptions, maxAge: undefined };
  response.clearCookie(stateCookieName, clearOptions);
  response.clearCookie(verifierCookieName, clearOptions);
  response.clearCookie(nonceCookieName, clearOptions);
}

customerAuthRouter.get("/google", googleStartLimiter, async (_request, response, next) => {
  try {
    const client = googleClient();
    if (!client) throw new HttpError(503, "Google sign-in is not configured", "GOOGLE_OAUTH_NOT_CONFIGURED");
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    if (!codeChallenge) throw new Error("Google OAuth client did not generate a PKCE challenge");
    response.cookie(stateCookieName, state, oauthCookieOptions);
    response.cookie(verifierCookieName, codeVerifier, oauthCookieOptions);
    response.cookie(nonceCookieName, nonce, oauthCookieOptions);
    response.redirect(client.generateAuthUrl({
      access_type: "online",
      scope: ["openid", "email", "profile"],
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: "select_account",
    }));
  } catch (error) { next(error); }
});

customerAuthRouter.get("/google/callback", googleCallbackLimiter, async (request, response, next) => {
  try {
    if (typeof request.query.error === "string") {
      clearOAuthCookies(response);
      redirectToApp(response, "cancelled");
      return;
    }
    const { code, state } = z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(request.query);
    const storedState = request.cookies?.[stateCookieName] as string | undefined;
    const codeVerifier = request.cookies?.[verifierCookieName] as string | undefined;
    const nonce = request.cookies?.[nonceCookieName] as string | undefined;
    if (!matchesOAuthState(storedState, state) || !codeVerifier || !nonce) throw new HttpError(400, "Google sign-in state is invalid or expired", "OAUTH_STATE_INVALID");
    clearOAuthCookies(response);

    const client = googleClient();
    if (!client) throw new HttpError(503, "Google sign-in is not configured", "GOOGLE_OAUTH_NOT_CONFIGURED");
    const { tokens } = await client.getToken({ code, codeVerifier });
    if (!tokens.id_token) throw new HttpError(401, "Google did not return an identity token", "GOOGLE_ID_TOKEN_MISSING");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
    const identity = readGoogleIdentity(ticket.getPayload() ?? {}, nonce);
    if (!identity) throw new HttpError(401, "Google account identity could not be verified", "GOOGLE_IDENTITY_INVALID");

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    const session = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { googleSub: identity.googleSub } });
      if (!user) {
        user = await tx.user.findUnique({ where: { email: identity.email } });
        if (user?.googleSub && user.googleSub !== identity.googleSub) throw new HttpError(409, "This email is linked to another Google account", "GOOGLE_ACCOUNT_CONFLICT");
        if (user) {
          user = await tx.user.update({ where: { id: user.id }, data: { googleSub: identity.googleSub, name: identity.name, avatarUrl: identity.avatarUrl } });
        } else {
          user = await tx.user.create({ data: { googleSub: identity.googleSub, email: identity.email, name: identity.name, avatarUrl: identity.avatarUrl } });
        }
      } else {
        user = await tx.user.update({ where: { id: user.id }, data: { name: identity.name, avatarUrl: identity.avatarUrl } });
      }
      if (user.status !== "ACTIVE") throw new HttpError(403, "This customer account is disabled", "CUSTOMER_ACCOUNT_DISABLED");
      const token = await new SignJWT({ role: "customer" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.id)
        .setJti(sessionId)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(accessSecret);
      await tx.customerSession.create({ data: { id: sessionId, userId: user.id, tokenHash: hashSessionToken(token), expiresAt } });
      return { token, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } };
    }, { isolationLevel: "Serializable" });

    response.cookie(customerCookieName, session.token, customerCookieOptions);
    redirectToApp(response, "success");
  } catch (error) { next(error); }
});

customerAuthRouter.get("/me", requireCustomer, async (request, response, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.customer!.id }, select: { id: true, email: true, name: true, avatarUrl: true } });
    response.json({ success: true, data: user });
  } catch (error) { next(error); }
});

customerAuthRouter.post("/logout", requireCustomer, async (request, response, next) => {
  try {
    await prisma.customerSession.updateMany({ where: { id: request.customer!.sessionId, userId: request.customer!.id, revokedAt: null }, data: { revokedAt: new Date() } });
    response.clearCookie(customerCookieName, { ...customerCookieOptions, maxAge: undefined });
    response.json({ success: true });
  } catch (error) { next(error); }
});
