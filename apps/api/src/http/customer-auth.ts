import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { hashSessionToken } from "../modules/auth/google-oauth.js";
import { HttpError } from "./errors.js";

declare global {
  namespace Express {
    interface Request {
      customer?: { id: string; sessionId: string };
    }
  }
}

export const customerCookieName = "customer_session";
export const customerCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

async function resolveCustomer(token: string): Promise<{ id: string; sessionId: string }> {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] }));
  } catch {
    throw new HttpError(401, "Phiên đăng nhập không hợp lệ", "UNAUTHENTICATED");
  }
  if (payload.role !== "customer" || typeof payload.sub !== "string" || typeof payload.jti !== "string") {
    throw new HttpError(401, "Phiên đăng nhập không hợp lệ", "UNAUTHENTICATED");
  }
  const session = await prisma.customerSession.findFirst({
    where: { id: payload.jti, userId: payload.sub, tokenHash: hashSessionToken(token), revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "ACTIVE" } },
    select: { id: true, userId: true },
  });
  if (!session) throw new HttpError(401, "Phiên đăng nhập đã hết hạn", "UNAUTHENTICATED");
  return { id: session.userId, sessionId: session.id };
}

export async function requireCustomer(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const token = request.cookies?.[customerCookieName] as string | undefined;
    if (!token) throw new HttpError(401, "Cần đăng nhập", "UNAUTHENTICATED");
    request.customer = await resolveCustomer(token);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalCustomer(request: Request, response: Response, next: NextFunction): Promise<void> {
  const token = request.cookies?.[customerCookieName] as string | undefined;
  if (!token) { next(); return; }
  try {
    request.customer = await resolveCustomer(token);
    next();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      response.clearCookie(customerCookieName, { ...customerCookieOptions, maxAge: undefined });
      next();
      return;
    }
    next(error);
  }
}
