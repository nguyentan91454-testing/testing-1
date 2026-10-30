import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { corsOrigins, env } from "./config/env.js";
import { errorHandler, HttpError } from "./http/errors.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { adminAuthRouter } from "./modules/auth/auth.routes.js";
import { cartRouter } from "./modules/cart/cart.routes.js";
import { checkoutRouter } from "./modules/orders/checkout.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger, genReqId: (request) => request.headers["x-request-id"]?.toString() ?? crypto.randomUUID() }));
app.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/products", catalogRouter);
app.use("/api/v1/admin/auth", adminAuthRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", checkoutRouter);
app.use("/api/v1/admin", adminRouter);
app.use((_request, _response, next) => next(new HttpError(404, "Không tìm thấy tài nguyên", "NOT_FOUND")));
app.use(errorHandler);

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

