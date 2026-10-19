import { Request, Response, NextFunction } from 'express';
import { JwtUtil, JwtPayload } from '../security/jwt';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';
import { Role } from '@techstore/shared';
import { prisma } from '../database/prisma';

// Extend Express Request type with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Vui lòng đăng nhập để tiếp tục');
    }

    const payload = JwtUtil.verifyAccessToken(token);

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn'));
  }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const payload = JwtUtil.verifyAccessToken(token);
      req.user = payload;
    }
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Vui lòng đăng nhập'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Bạn không có quyền truy cập chức năng này'));
    }

    next();
  };
}
