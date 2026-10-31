import { OrderStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

export const adminReportsRouter = Router();
const dateString = z.string().date();

adminReportsRouter.get("/summary", async (request, response, next) => {
  try {
    const query = z.object({ from: dateString.optional(), to: dateString.optional() }).parse(request.query);
    const now = new Date();
    const toDate = query.to ? new Date(`${query.to}T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fromDate = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(toDate.getTime() - 29 * 86_400_000);
    const toExclusive = new Date(toDate.getTime() + 86_400_000);
    if (fromDate >= toExclusive || toExclusive.getTime() - fromDate.getTime() > 367 * 86_400_000) {
      response.status(400).json({ success: false, message: "Date range must be valid and at most 366 days", code: "INVALID_REPORT_RANGE" });
      return;
    }
    const where: Prisma.OrderWhereInput = { createdAt: { gte: fromDate, lt: toExclusive } };
    const revenueWhere: Prisma.OrderWhereInput = { ...where, orderStatus: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED, OrderStatus.REFUNDED] } };
    const [orderCount, revenue, statusBreakdown, paymentBreakdown, salesByDay, topProducts, couponPerformance] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({ where: revenueWhere, _sum: { totalVnd: true, subtotalVnd: true, discountVnd: true } }),
      prisma.order.groupBy({ by: ["orderStatus"], where, _count: { _all: true }, orderBy: { orderStatus: "asc" } }),
      prisma.order.groupBy({ by: ["paymentMethod"], where, _count: { _all: true }, orderBy: { paymentMethod: "asc" } }),
      prisma.$queryRaw<Array<{ day: string; orderCount: number; revenueVnd: bigint }>>(Prisma.sql`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
               count(*)::int AS "orderCount",
               coalesce(sum(total_vnd), 0)::bigint AS "revenueVnd"
        FROM orders
        WHERE created_at >= ${fromDate} AND created_at < ${toExclusive}
          AND order_status NOT IN ('CANCELLED', 'RETURNED', 'REFUNDED')
        GROUP BY 1 ORDER BY 1
      `),
      prisma.$queryRaw<Array<{ productName: string; quantity: number; revenueVnd: bigint }>>(Prisma.sql`
        SELECT oi.product_name AS "productName",
               coalesce(sum(oi.quantity), 0)::int AS quantity,
               coalesce(sum(oi.unit_price_vnd::bigint * oi.quantity), 0)::bigint AS "revenueVnd"
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${fromDate} AND o.created_at < ${toExclusive}
          AND o.order_status NOT IN ('CANCELLED', 'RETURNED', 'REFUNDED')
        GROUP BY oi.product_name ORDER BY quantity DESC, "revenueVnd" DESC LIMIT 10
      `),
      prisma.$queryRaw<Array<{ code: string; redemptionCount: number; discountVnd: bigint }>>(Prisma.sql`
        SELECT c.code, count(r.id)::int AS "redemptionCount",
               coalesce(sum(o.discount_vnd), 0)::bigint AS "discountVnd"
        FROM coupon_redemptions r
        JOIN coupons c ON c.id = r.coupon_id
        JOIN orders o ON o.id = r.order_id
        WHERE o.created_at >= ${fromDate} AND o.created_at < ${toExclusive}
        GROUP BY c.code ORDER BY "redemptionCount" DESC, c.code ASC
      `),
    ]);
    response.json({
      success: true,
      data: {
        from: fromDate.toISOString(),
        to: new Date(toExclusive.getTime() - 1).toISOString(),
        orderCount,
        revenueVnd: revenue._sum.totalVnd ?? 0,
        subtotalVnd: revenue._sum.subtotalVnd ?? 0,
        discountVnd: revenue._sum.discountVnd ?? 0,
        statusBreakdown: statusBreakdown.map((row) => ({ status: row.orderStatus, count: row._count._all })),
        paymentBreakdown: paymentBreakdown.map((row) => ({ paymentMethod: row.paymentMethod, count: row._count._all })),
        salesByDay: salesByDay.map((row) => ({ day: row.day, orderCount: row.orderCount, revenueVnd: Number(row.revenueVnd) })),
        topProducts: topProducts.map((row) => ({ ...row, revenueVnd: Number(row.revenueVnd) })),
        couponPerformance: couponPerformance.map((row) => ({ ...row, discountVnd: Number(row.discountVnd) })),
      },
    });
  } catch (error) { next(error); }
});
