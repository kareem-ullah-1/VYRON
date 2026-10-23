import { env } from "../config/env";
import { ok } from "../lib/http";
import { num } from "../lib/format";
import { controller, route } from "../lib/route";
import { Prisma, prisma } from "../lib/prisma";
import { zonedMidnight, zonedYMD } from "../lib/tz";
import { getSalesStats } from "../services/stats";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CHART_MONTHS = 6;
const DAY_MS = 86_400_000;

async function monthlyTotals(table: "Sale" | "Purchase", since: Date) {
  const tz = env.APP_TIMEZONE;
  const rows =
    table === "Sale"
      ? await prisma.$queryRaw<{ ym: string; total: Prisma.Decimal | string }[]>(Prisma.sql`
          SELECT to_char(("saleDate" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM') AS ym, SUM("finalAmount") AS total
          FROM "Sale" WHERE status = 'Completed' AND "saleDate" >= ${since} GROUP BY 1`)
      : await prisma.$queryRaw<{ ym: string; total: Prisma.Decimal | string }[]>(Prisma.sql`
          SELECT to_char(("purchaseDate" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM') AS ym, SUM("totalAmount") AS total
          FROM "Purchase" WHERE "purchaseDate" >= ${since} GROUP BY 1`);
  return new Map(rows.map((r) => [r.ym, Number(r.total)]));
}

/** Completed custom orders, by the month they were completed in (see getSalesStats for why `updatedAt` is a reliable completion date). */
async function monthlyCustomOrderTotals(since: Date) {
  const tz = env.APP_TIMEZONE;
  const rows = await prisma.$queryRaw<{ ym: string; total: Prisma.Decimal | string }[]>(Prisma.sql`
    SELECT to_char(("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM') AS ym, SUM("totalAmount") AS total
    FROM "CustomOrder" WHERE status = 'Complete' AND "updatedAt" >= ${since} GROUP BY 1`);
  return new Map(rows.map((r) => [r.ym, Number(r.total)]));
}

export const router = controller("Dashboard", [
  route({
    method: "get",
    path: "/GetOverview",
    summary: "Dashboard stats, 6-month sales vs purchases, recent sales, top products, low stock",
    access: "authenticated",
    handler: async () => {
      const tz = env.APP_TIMEZONE;
      const now = new Date();
      const { year, month } = zonedYMD(now, tz);

      const buckets = Array.from({ length: CHART_MONTHS }, (_, i) => {
        const d = new Date(Date.UTC(year, month - 1 - (CHART_MONTHS - 1 - i), 1));
        return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
      });
      const since = zonedMidnight(buckets[0].y, buckets[0].m, 1, tz);
      const periodStart = new Date(now.getTime() - 30 * DAY_MS);
      const prevStart = new Date(now.getTime() - 60 * DAY_MS);

      const [stats, productCount, customerCount, salesByMonth, purchasesByMonth, customOrdersByMonth, recent, recentOrders, top, low] = await Promise.all([
        getSalesStats(),
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.customer.count({ where: { isActive: true } }),
        monthlyTotals("Sale", since),
        monthlyTotals("Purchase", since),
        monthlyCustomOrderTotals(since),
        prisma.sale.findMany({ orderBy: [{ saleDate: "desc" }, { id: "desc" }], take: 5 }),
        prisma.customOrder.findMany({
          where: { status: "Complete" },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
          select: { id: true, customerName: true, totalAmount: true, updatedAt: true, status: true },
        }),
        prisma.$queryRaw<{ id: number; name: string; price: Prisma.Decimal | string; cur: bigint; prev: bigint }[]>(Prisma.sql`
          SELECT p.id, p."productName" AS name,
                 (SELECT MIN(v2.price) FROM "ProductVariant" v2 WHERE v2."productId" = p.id AND v2."deletedAt" IS NULL) AS price,
                 COALESCE(SUM(si.quantity) FILTER (WHERE s."saleDate" >= ${periodStart}), 0) AS cur,
                 COALESCE(SUM(si.quantity) FILTER (WHERE s."saleDate" >= ${prevStart} AND s."saleDate" < ${periodStart}), 0) AS prev
          FROM "SaleItem" si
          JOIN "Sale" s ON s.id = si."saleId" AND s.status = 'Completed'
          JOIN "ProductVariant" v ON v.id = si."productVariantId"
          JOIN "Product" p ON p.id = v."productId" AND p."deletedAt" IS NULL
          WHERE s."saleDate" >= ${prevStart}
          GROUP BY p.id
          HAVING COALESCE(SUM(si.quantity) FILTER (WHERE s."saleDate" >= ${periodStart}), 0) > 0
          ORDER BY cur DESC, p.id LIMIT 5`),
        prisma.$queryRaw<{ id: number; name: string; code: string; threshold: number; stock: bigint }[]>(Prisma.sql`
          SELECT p.id, p."productName" AS name, p."productCode" AS code, p."lowStockThreshold" AS threshold,
                 COALESCE(SUM(v.stock) FILTER (WHERE v."deletedAt" IS NULL), 0) AS stock
          FROM "Product" p LEFT JOIN "ProductVariant" v ON v."productId" = p.id
          WHERE p."deletedAt" IS NULL
          GROUP BY p.id
          HAVING COALESCE(SUM(v.stock) FILTER (WHERE v."deletedAt" IS NULL), 0) <= p."lowStockThreshold"
          ORDER BY stock ASC, p.id LIMIT 10`),
      ]);

      return ok({
        Stats: {
          TotalSales: stats.totalSales,
          TotalProfit: stats.totalProfit,
          TodaySales: stats.todaySales,
          TotalTransactions: stats.totalTransactions,
          TotalProducts: productCount,
          TotalCustomers: customerCount,
        },
        SalesChartData: buckets.map(({ y, m }) => {
          const key = `${y}-${String(m).padStart(2, "0")}`;
          const sales = (salesByMonth.get(key) ?? 0) + (customOrdersByMonth.get(key) ?? 0);
          return { Name: MONTHS[m - 1], Sales: sales, Purchases: purchasesByMonth.get(key) ?? 0 };
        }),
        RecentSales: [
          ...recent.map((s) => ({ Id: s.id, CustomerName: s.customerName, FinalAmount: num(s.finalAmount), date: s.saleDate, Status: s.status })),
          ...recentOrders.map((o) => ({ Id: o.id, CustomerName: o.customerName, FinalAmount: num(o.totalAmount), date: o.updatedAt, Status: o.status })),
        ]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5)
          .map(({ date, ...s }) => ({ ...s, SaleDate: date.toISOString() })),
        TopProducts: top.map((r) => {
          const cur = Number(r.cur);
          const prev = Number(r.prev);
          const growth = prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
          return {
            Id: r.id,
            Name: r.name,
            Price: Number(r.price ?? 0),
            SalesCount: cur,
            GrowthPercentage: Math.round(growth * 10) / 10,
          };
        }),
        LowStockProducts: low.map((r) => ({
          Id: r.id,
          Name: r.name,
          Stock: Number(r.stock),
          LowStockThreshold: r.threshold,
          ProductCode: r.code,
        })),
      });
    },
  }),
]);
