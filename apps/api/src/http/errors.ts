import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ success: false, message: "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR", issues: error.issues });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ success: false, message: error.message, code: error.code });
    return;
  }
  logger.error({ err: error }, "Unhandled request error");
  response.status(500).json({
    success: false,
    message: "Đã xảy ra lỗi hệ thống",
    code: "INTERNAL_SERVER_ERROR",
  });
};

