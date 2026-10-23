// Pure functions that rebuild the dashboard / stats / report payloads from the sample entities,
// mirroring backend/src/modules/{dashboard,report}.ts and services/stats.ts so figures always agree.

export const DAY_MS = 86_400_000;
// The backend aggregates by APP_TIMEZONE (Asia/Karachi, UTC+5, no DST).
const TZ_OFFSET_MS = 5 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const ymd = (ms: number) => new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
const startOfDay = (ms: number) => Math.floor((ms + TZ_OFFSET_MS) / DAY_MS) * DAY_MS - TZ_OFFSET_MS;
const t = (s: string) => new Date(s).getTime();

export interface DemoEntities {
  products: any[];
  sales: any[]; // /Sales/GetAllSales: POS sales + completed custom orders (Source tells which)
  purchases: any[];
  customersCount: number;
}

const completed = (e: DemoEntities) => e.sales.filter((s) => s.Status === "Completed");

export function computeStats(e: DemoEntities, now: number) {
  const done = completed(e);
  const today = startOfDay(now);
  const totalSales = sum(done.map((s) => s.FinalAmount));
  return {
    totalSales: round2(totalSales),
    totalProfit: round2(totalSales - sum(e.purchases.map((p) => p.TotalAmount))),
    todaySales: round2(sum(done.filter((s) => t(s.SaleDate) >= today).map((s) => s.FinalAmount))),
    totalTransactions: done.length,
  };
}

export function computeOverview(e: DemoEntities, now: number) {
  const stats = computeStats(e, now);
  const [y, m] = ymd(now).split("-").map(Number);
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1));
    return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, name: MONTHS[d.getUTCMonth()] };
  });
  const done = completed(e);
  const monthSum = (rows: any[], dateKey: string, amountKey: string, key: string) =>
    sum(rows.filter((r) => ymd(t(r[dateKey])).slice(0, 7) === key).map((r) => r[amountKey]));

  const periodStart = now - 30 * DAY_MS;
  const prevStart = now - 60 * DAY_MS;
  const variantToProduct = new Map<number, any>();
  for (const p of e.products) for (const v of p.Variants ?? []) variantToProduct.set(v.Id, p);
  const perProduct = new Map<number, { p: any; cur: number; prev: number }>();
  for (const s of done.filter((x) => x.Source === "Sale")) {
    const when = t(s.SaleDate);
    if (when < prevStart) continue;
    for (const it of s.SaleItems) {
      const p = variantToProduct.get(it.ProductVariantId);
      if (!p) continue;
      const row = perProduct.get(p.Id) ?? { p, cur: 0, prev: 0 };
      if (when >= periodStart) row.cur += it.Quantity;
      else row.prev += it.Quantity;
      perProduct.set(p.Id, row);
    }
  }

  return {
    Stats: {
      TotalSales: stats.totalSales,
      TotalProfit: stats.totalProfit,
      TodaySales: stats.todaySales,
      TotalTransactions: stats.totalTransactions,
      TotalProducts: e.products.length,
      TotalCustomers: e.customersCount,
    },
    SalesChartData: buckets.map(({ key, name }) => ({
      Name: name,
      Sales: round2(monthSum(done, "SaleDate", "FinalAmount", key)),
      Purchases: round2(monthSum(e.purchases, "PurchaseDate", "TotalAmount", key)),
    })),
    RecentSales: [...e.sales]
      .sort((a, b) => t(b.SaleDate) - t(a.SaleDate))
      .slice(0, 5)
      .map((s) => ({
        Id: s.Id,
        CustomerName: s.CustomerName,
        FinalAmount: s.FinalAmount,
        Status: s.Source === "CustomOrder" ? "Complete" : s.Status,
        SaleDate: s.SaleDate,
      })),
    TopProducts: Array.from(perProduct.values())
      .filter((r) => r.cur > 0)
      .sort((a, b) => b.cur - a.cur || a.p.Id - b.p.Id)
      .slice(0, 5)
      .map(({ p, cur, prev }) => ({
        Id: p.Id,
        Name: p.ProductName,
        Price: Math.min(...(p.Variants ?? []).map((v: any) => v.Price)),
        SalesCount: cur,
        GrowthPercentage: Math.round((prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100) * 10) / 10,
      })),
    LowStockProducts: e.products
      .map((p) => ({ p, stock: sum((p.Variants ?? []).map((v: any) => v.Stock)) }))
      .filter(({ p, stock }) => stock <= p.LowStockThreshold)
      .sort((a, b) => a.stock - b.stock || a.p.Id - b.p.Id)
      .slice(0, 10)
      .map(({ p, stock }) => ({ Id: p.Id, Name: p.ProductName, Stock: stock, LowStockThreshold: p.LowStockThreshold, ProductCode: p.ProductCode })),
  };
}

export class DemoRangeError extends Error {}

export function computeSalesReport(e: DemoEntities, now: number, q: { StartDate?: string; EndDate?: string }) {
  const today = ymd(now);
  const startStr = q.StartDate ?? `${today.slice(0, 8)}01`;
  const endStr = q.EndDate ?? today;
  const midnight = (s: string) => {
    const [yy, mm, dd] = s.split("-").map(Number);
    return Date.UTC(yy, mm - 1, dd) - TZ_OFFSET_MS;
  };
  const start = midnight(startStr);
  const endExclusive = midnight(endStr) + DAY_MS;
  if (endExclusive <= start) throw new DemoRangeError("End date must be on or after start date");

  const rows = completed(e).filter((s) => t(s.SaleDate) >= start && t(s.SaleDate) < endExclusive);
  const totalSales = sum(rows.map((s) => s.FinalAmount));
  const purchases = sum(e.purchases.filter((p) => t(p.PurchaseDate) >= start && t(p.PurchaseDate) < endExclusive).map((p) => p.TotalAmount));

  const group = <K extends string>(keyOf: (s: any) => K) => {
    const map = new Map<K, { sales: number; transactions: number }>();
    for (const s of rows) {
      const cur = map.get(keyOf(s)) ?? { sales: 0, transactions: 0 };
      map.set(keyOf(s), { sales: cur.sales + s.FinalAmount, transactions: cur.transactions + 1 });
    }
    return map;
  };
  const products = new Map<string, { quantity: number; sales: number }>();
  for (const s of rows)
    for (const it of s.SaleItems) {
      const cur = products.get(it.ProductVariantName) ?? { quantity: 0, sales: 0 };
      products.set(it.ProductVariantName, { quantity: cur.quantity + it.Quantity, sales: cur.sales + it.TotalPrice });
    }

  return {
    Range: { StartDate: startStr, EndDate: endStr },
    Summary: {
      TotalSales: round2(totalSales),
      TotalTransactions: rows.length,
      TotalDiscount: round2(sum(rows.map((s) => s.DiscountAmount))),
      AverageSaleValue: rows.length > 0 ? round2(totalSales / rows.length) : 0,
      TotalProfit: round2(totalSales - purchases),
    },
    ByDay: Array.from(group((s) => ymd(t(s.SaleDate))).entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ Date: date, Sales: round2(v.sales), Transactions: v.transactions })),
    ByPaymentMethod: Array.from(group((s) => s.PaymentMethod || "Unspecified").entries())
      .sort(([, a], [, b]) => b.sales - a.sales)
      .map(([method, v]) => ({ PaymentMethod: method, Sales: round2(v.sales), Transactions: v.transactions })),
    ByProduct: Array.from(products.entries())
      .sort(([, a], [, b]) => b.sales - a.sales)
      .map(([name, v]) => ({ Name: name, Quantity: v.quantity, Sales: round2(v.sales) })),
  };
}
