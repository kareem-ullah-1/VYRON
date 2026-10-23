import { z } from "zod";
import { env } from "../config/env";
import { badRequest, ok } from "../lib/http";
import { dec, money, num } from "../lib/format";
import { flattenCustomOrderBlocks } from "../lib/customOrderItems";
import { controller, route } from "../lib/route";
import { Prisma, prisma } from "../lib/prisma";
import { zonedMidnight, zonedYMD } from "../lib/tz";

const DAY_MS = 86_400_000;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const reportQuery = z.object({
  StartDate: dateOnly.optional(),
  EndDate: dateOnly.optional(),
});
type ReportQuery = z.infer<typeof reportQuery>;

const ymd = (d: Date, tz: string) => {
  const p = zonedYMD(d, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

/** Defaults to month-to-date when no range is given. `endExclusive` is the day after EndDate (tz-correct bound for a `< endExclusive` query). */
function resolveRange(tz: string, q: ReportQuery) {
  const today = zonedYMD(new Date(), tz);

  const start = q.StartDate
    ? zonedMidnight(...(q.StartDate.split("-").map(Number) as [number, number, number]), tz)
    : zonedMidnight(today.year, today.month, 1, tz);

  const endDay = q.EndDate
    ? zonedMidnight(...(q.EndDate.split("-").map(Number) as [number, number, number]), tz)
    : zonedMidnight(today.year, today.month, today.day, tz);
  const endExclusive = new Date(endDay.getTime() + DAY_MS);

  if (endExclusive <= start) throw badRequest("End date must be on or after start date");
  return { start, endExclusive };
}

export const router = controller("Report", [
  route({
    method: "get",
    path: "/GetSalesReport",
    summary: "Sales report for a date range: totals plus breakdowns by day, payment method and product (POS sales + completed custom orders)",
    access: "authenticated",
    query: reportQuery,
    handler: async ({ query }) => {
      const tz = env.APP_TIMEZONE;
      const { start, endExclusive } = resolveRange(tz, query);

      const saleWhere = { status: "Completed", saleDate: { gte: start, lt: endExclusive } } as const;
      const orderWhere = { status: "Complete", updatedAt: { gte: start, lt: endExclusive } } as const;

      const [saleAgg, orderAgg, purchaseAgg, byDaySales, byDayOrders, byPaymentSales, byPaymentOrders, byProductSales, orderBlocks] =
        await Promise.all([
          prisma.sale.aggregate({ where: saleWhere, _sum: { finalAmount: true, discountAmount: true }, _count: { _all: true } }),
          prisma.customOrder.aggregate({ where: orderWhere, _sum: { totalAmount: true }, _count: { _all: true } }),
          prisma.purchase.aggregate({ where: { purchaseDate: { gte: start, lt: endExclusive } }, _sum: { totalAmount: true } }),

          prisma.$queryRaw<{ d: string; total: Prisma.Decimal | string; cnt: bigint }[]>(Prisma.sql`
            SELECT to_char(("saleDate" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS d, SUM("finalAmount") AS total, COUNT(*) AS cnt
            FROM "Sale" WHERE status = 'Completed' AND "saleDate" >= ${start} AND "saleDate" < ${endExclusive} GROUP BY 1`),
          prisma.$queryRaw<{ d: string; total: Prisma.Decimal | string; cnt: bigint }[]>(Prisma.sql`
            SELECT to_char(("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS d, SUM("totalAmount") AS total, COUNT(*) AS cnt
            FROM "CustomOrder" WHERE status = 'Complete' AND "updatedAt" >= ${start} AND "updatedAt" < ${endExclusive} GROUP BY 1`),

          prisma.$queryRaw<{ pm: string; total: Prisma.Decimal | string; cnt: bigint }[]>(Prisma.sql`
            SELECT "paymentMethod" AS pm, SUM("finalAmount") AS total, COUNT(*) AS cnt
            FROM "Sale" WHERE status = 'Completed' AND "saleDate" >= ${start} AND "saleDate" < ${endExclusive} GROUP BY 1`),
          prisma.$queryRaw<{ pm: string | null; total: Prisma.Decimal | string; cnt: bigint }[]>(Prisma.sql`
            SELECT "paymentMethod" AS pm, SUM("totalAmount") AS total, COUNT(*) AS cnt
            FROM "CustomOrder" WHERE status = 'Complete' AND "updatedAt" >= ${start} AND "updatedAt" < ${endExclusive} GROUP BY 1`),

          prisma.saleItem.groupBy({ by: ["productVariantName"], where: { sale: saleWhere }, _sum: { quantity: true, totalPrice: true } }),
          prisma.customOrder.findMany({ where: orderWhere, select: { blocks: true } }),
        ]);

      const totalSales = num(saleAgg._sum.finalAmount) + num(orderAgg._sum.totalAmount);
      const totalTransactions = saleAgg._count._all + orderAgg._count._all;

      const dayMap = new Map<string, { sales: number; transactions: number }>();
      for (const r of byDaySales) dayMap.set(r.d, { sales: Number(r.total), transactions: Number(r.cnt) });
      for (const r of byDayOrders) {
        const cur = dayMap.get(r.d) ?? { sales: 0, transactions: 0 };
        dayMap.set(r.d, { sales: cur.sales + Number(r.total), transactions: cur.transactions + Number(r.cnt) });
      }

      const paymentMap = new Map<string, { sales: number; transactions: number }>();
      for (const r of byPaymentSales) paymentMap.set(r.pm || "Unspecified", { sales: Number(r.total), transactions: Number(r.cnt) });
      for (const r of byPaymentOrders) {
        const key = r.pm || "Unspecified";
        const cur = paymentMap.get(key) ?? { sales: 0, transactions: 0 };
        paymentMap.set(key, { sales: cur.sales + Number(r.total), transactions: cur.transactions + Number(r.cnt) });
      }

      const productMap = new Map<string, { quantity: number; sales: number }>();
      for (const r of byProductSales) productMap.set(r.productVariantName, { quantity: r._sum.quantity ?? 0, sales: num(r._sum.totalPrice) });
      for (const row of orderBlocks) {
        for (const item of flattenCustomOrderBlocks(row.blocks)) {
          const cur = productMap.get(item.Name) ?? { quantity: 0, sales: 0 };
          const lineTotal = money(dec(item.Qty).mul(item.Price)).toNumber();
          productMap.set(item.Name, { quantity: cur.quantity + item.Qty, sales: cur.sales + lineTotal });
        }
      }

      return ok({
        Range: { StartDate: ymd(start, tz), EndDate: ymd(new Date(endExclusive.getTime() - DAY_MS), tz) },
        Summary: {
          TotalSales: totalSales,
          TotalTransactions: totalTransactions,
          TotalDiscount: num(saleAgg._sum.discountAmount),
          AverageSaleValue: totalTransactions > 0 ? Math.round((totalSales / totalTransactions) * 100) / 100 : 0,
          TotalProfit: Math.round((totalSales - num(purchaseAgg._sum.totalAmount)) * 100) / 100,
        },
        ByDay: [...dayMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ Date: date, Sales: v.sales, Transactions: v.transactions })),
        ByPaymentMethod: [...paymentMap.entries()]
          .sort(([, a], [, b]) => b.sales - a.sales)
          .map(([method, v]) => ({ PaymentMethod: method, Sales: v.sales, Transactions: v.transactions })),
        ByProduct: [...productMap.entries()]
          .sort(([, a], [, b]) => b.sales - a.sales)
          .map(([name, v]) => ({ Name: name, Quantity: v.quantity, Sales: v.sales })),
      });
    },
  }),
]);
