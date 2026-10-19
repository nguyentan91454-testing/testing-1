import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../../config';
import { Role } from '@techstore/shared';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export class JwtUtil {
  static signAccessToken(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN as any,
    };
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, options);
  }

  static signRefreshToken(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as any,
    };
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, options);
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
  }

  static setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = config.NODE_ENV === 'production';
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE || isProduction,
      sameSite: (config.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }

  static clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.COOKIE_SECURE || config.NODE_ENV === 'production',
      sameSite: (config.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
      path: '/api/v1/auth',
    });
  }
}
