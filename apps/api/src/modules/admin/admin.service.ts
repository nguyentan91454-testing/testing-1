import { prisma } from '../../core/database/prisma';
import { OrderStatus, PaymentStatus } from '@techstore/shared';

export class AdminService {
  async getDashboardStats() {
    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      orders,
      recentOrdersRaw,
      topOrderItems,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count(),
      prisma.product.findMany({
        where: { stock: { lte: 10 } },
        select: { id: true, name: true, slug: true, stock: true, price: true },
        take: 10,
      }),
      prisma.order.findMany({
        where: {
          paymentStatus: PaymentStatus.PAID,
        },
        select: { totalAmount: true, createdAt: true, status: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payment: true,
          user: { select: { fullName: true, email: true, phone: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'productName', 'productSlug', 'productImage', 'price'],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const totalRevenue = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // Revenue Trends (last 7 days)
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, { revenue: 0, orders: 0 });
    }

    orders.forEach((o) => {
      const dateStr = o.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(dateStr)) {
        const curr = dailyMap.get(dateStr)!;
        curr.revenue += o.totalAmount;
        curr.orders += 1;
      }
    });

    const revenueTrends = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
    }));

    // Orders By Status
    const allOrdersStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const totalOrdersCount = totalOrders || 1;
    const ordersByStatus = allOrdersStatus.map((item) => ({
      status: item.status as OrderStatus,
      count: item._count.status,
      percentage: Math.round((item._count.status / totalOrdersCount) * 100),
    }));

    // Format top selling products
    const topSellingProducts = topOrderItems.map((item) => ({
      id: item.productId,
      name: item.productName,
      slug: item.productSlug,
      imageUrl: item.productImage,
      price: item.price,
      totalSold: item._sum.quantity || 0,
      revenue: item._sum.total || 0,
    }));

    return {
      totalRevenue,
      revenueGrowthPercent: 12.5,
      totalOrders,
      orderGrowthPercent: 8.2,
      totalCustomers,
      customerGrowthPercent: 15.0,
      totalProducts,
      lowStockProductsCount: lowStockProducts.length,
      lowStockProducts,
      recentOrders: recentOrdersRaw.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        userId: o.userId,
        user: o.user,
        status: o.status,
        totalAmount: o.totalAmount,
        paymentStatus: o.paymentStatus,
        itemCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
      })),
      topSellingProducts,
      revenueTrends,
      ordersByStatus,
    };
  }

  async getAuditLogs(page = 1, limit = 30) {
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true, role: true } },
        },
      }),
    ]);

    return {
      items: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        user: l.user,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        details: l.details ? JSON.parse(l.details) : null,
        createdAt: l.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const adminService = new AdminService();
