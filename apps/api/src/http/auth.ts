import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./errors.js";

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; sessionId: string };
    }
  }
}

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export async function requireAdmin(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const token = request.cookies?.admin_session as string | undefined;
    if (!token) throw new HttpError(401, "Cần đăng nhập quản trị", "UNAUTHENTICATED");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.role !== "admin" || typeof payload.sub !== "string" || typeof payload.jti !== "string") {
      throw new HttpError(401, "Phiên đăng nhập không hợp lệ", "UNAUTHENTICATED");
    }
    const session = await prisma.adminSession.findFirst({
      where: { id: payload.jti, adminId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() }, admin: { isActive: true } },
      select: { id: true, adminId: true },
    });
    if (!session) throw new HttpError(401, "Phiên đăng nhập đã hết hạn", "UNAUTHENTICATED");
    request.admin = { id: session.adminId, sessionId: session.id };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Phiên đăng nhập không hợp lệ", "UNAUTHENTICATED"));
  }
}

