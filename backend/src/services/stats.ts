import { env } from "../config/env";
import { num } from "../lib/format";
import { prisma } from "../lib/prisma";
import { startOfDay } from "../lib/tz";

/**
 * Sales figures shared by /Sales/GetDashboardStats and /Dashboard/GetOverview.
 *
 * The data model has no product cost price, so `totalProfit` is cash-flow profit:
 * all completed sales revenue (POS sales + completed custom orders) minus all
 * raw-material purchase spend.
 *
 * Completed custom orders are included because a `Complete` order is only
 * reachable once `paidAmount === totalAmount` (enforced in CustomOrder's
 * UpdateStatus handler), and no further edits/payments are possible on a
 * Complete order — so `totalAmount` is realised revenue and `updatedAt` is a
 * reliable completion timestamp.
 */
export async function getSalesStats() {
  const todayStart = startOfDay(new Date(), env.APP_TIMEZONE);
  const completed = { status: "Completed" };
  const completedOrders = { status: "Complete" };
  const [all, today, purchases, coAll, coToday] = await Promise.all([
    prisma.sale.aggregate({ where: completed, _sum: { finalAmount: true }, _count: { _all: true } }),
    prisma.sale.aggregate({ where: { ...completed, saleDate: { gte: todayStart } }, _sum: { finalAmount: true } }),
    prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
    prisma.customOrder.aggregate({ where: completedOrders, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.customOrder.aggregate({ where: { ...completedOrders, updatedAt: { gte: todayStart } }, _sum: { totalAmount: true } }),
  ]);
  const totalSales = num(all._sum.finalAmount) + num(coAll._sum.totalAmount);
  return {
    totalSales,
    totalProfit: Math.round((totalSales - num(purchases._sum.totalAmount)) * 100) / 100,
    todaySales: num(today._sum.finalAmount) + num(coToday._sum.totalAmount),
    totalTransactions: all._count._all + coAll._count._all,
  };
}
