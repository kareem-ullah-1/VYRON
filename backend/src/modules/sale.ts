import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { badRequest, conflict, notFound, ok, parseId } from "../lib/http";
import { dec, iso, money, num } from "../lib/format";
import { text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { Prisma, prisma } from "../lib/prisma";
import { getSalesStats } from "../services/stats";

export const saleInclude = { items: { orderBy: { id: "asc" } } } satisfies Prisma.SaleInclude;
type SaleFull = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

export const saleDto = (s: SaleFull) => {
  const items = s.items.map((i) => ({
    Id: i.id,
    SaleId: i.saleId,
    ProductVariantId: i.productVariantId,
    ProductVariantName: i.productVariantName,
    Quantity: i.quantity,
    UnitPrice: num(i.unitPrice),
    TotalPrice: num(i.totalPrice),
    DiscountAmount: num(i.discountAmount),
  }));
  return {
    Id: s.id,
    CustomerId: s.customerId,
    SaleDate: iso(s.saleDate),
    TotalAmount: num(s.totalAmount),
    DiscountAmount: num(s.discountAmount),
    FinalAmount: num(s.finalAmount),
    PaymentMethod: s.paymentMethod,
    Status: s.status,
    CustomerName: s.customerName,
    CustomerNumber: s.customerNumber,
    CreatedAt: iso(s.createdAt),
    SaleItems: items,
    // POSInterface's reorder flow reads `Items`.
    Items: items,
    Source: "Sale" as const,
  };
};

/**
 * Represents a completed custom order in the same shape as `saleDto` so it can appear
 * in the Sales list / dashboard alongside POS sales, without creating a real Sale row
 * (CustomOrder items are free-text, not tied to a ProductVariant, so a real SaleItem —
 * whose productVariantId is required and FK-restricted — cannot represent them).
 * `Source: "CustomOrder"` lets the frontend keep this read-only (no edit/delete/receipt).
 */
type CustomOrderAsSale = Prisma.CustomOrderGetPayload<{}>;

const customOrderBlocksSchema = z.array(
  z.object({ Items: z.array(z.object({ Name: z.string(), Qty: z.number(), Price: z.number() })) }),
);

export const customOrderAsSaleDto = (o: CustomOrderAsSale) => {
  const blocks = customOrderBlocksSchema.safeParse(o.blocks);
  const items = (blocks.success ? blocks.data : []).flatMap((b, bi) =>
    b.Items.map((it, ii) => ({
      Id: bi * 1000 + ii,
      SaleId: o.id,
      ProductVariantId: null,
      ProductVariantName: it.Name,
      Quantity: it.Qty,
      UnitPrice: it.Price,
      TotalPrice: money(dec(it.Qty).mul(it.Price)).toNumber(),
      DiscountAmount: 0,
    })),
  );
  return {
    Id: o.id,
    CustomerId: o.customerId,
    SaleDate: iso(o.updatedAt),
    TotalAmount: num(o.totalAmount),
    DiscountAmount: 0,
    FinalAmount: num(o.totalAmount),
    PaymentMethod: o.paymentMethod,
    Status: "Completed",
    CustomerName: o.customerName,
    CustomerNumber: o.customerContact,
    CreatedAt: iso(o.createdAt),
    SaleItems: items,
    Items: items,
    Source: "CustomOrder" as const,
    OrderNumber: o.orderNumber,
  };
};

const addSaleBody = z.object({
  customerId: z.coerce.number().int().positive().nullish(),
  customerName: text(150).nullish(),
  customerNumber: text(30).nullish(),
  paymentMethod: text(50).min(1).default("Cash"),
  discountAmount: z.coerce.number().min(0).max(99_999_999).default(0),
  items: z
    .array(
      z.object({
        productVariantId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int("Quantity must be a whole number").positive("Quantity must be at least 1").max(100_000),
        discountAmount: z.coerce.number().min(0).max(99_999_999).default(0),
      }),
    )
    .min(1, "Cart is empty")
    .max(200),
});

const MANAGE: Role[] = [Role.Admin, Role.Manager];

export const router = controller("Sales", [
  route({
    method: "post",
    path: "/AddSale",
    summary: "Record a sale and deduct stock atomically",
    access: "authenticated",
    body: addSaleBody,
    handler: async ({ body, user }) => {
      // The same variant may be sent on several lines; merge them.
      const lines = new Map<number, { qty: number; discount: number }>();
      for (const it of body.items) {
        const cur = lines.get(it.productVariantId) ?? { qty: 0, discount: 0 };
        cur.qty += it.quantity;
        cur.discount += it.discountAmount;
        lines.set(it.productVariantId, cur);
      }
      const ids = [...lines.keys()].sort((a, b) => a - b);

      const saleId = await prisma.$transaction(async (tx) => {
        let customer: { id: number; fullName: string; contactNumber: string } | null = null;
        if (body.customerId) {
          customer = await tx.customer.findFirst({
            where: { id: body.customerId, isActive: true },
            select: { id: true, fullName: true, contactNumber: true },
          });
          if (!customer) throw badRequest("Customer not found");
        }

        // Row locks (in id order, so concurrent sales cannot deadlock) make the stock check + decrement atomic.
        const locked = await tx.$queryRaw<{ id: number; price: Prisma.Decimal | string; stock: number }[]>(Prisma.sql`
          SELECT v.id, v.price, v.stock FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
          WHERE v.id IN (${Prisma.join(ids)}) AND v."deletedAt" IS NULL AND p."deletedAt" IS NULL
          ORDER BY v.id FOR UPDATE OF v`);
        const byId = new Map(locked.map((r) => [r.id, r]));
        const details = await tx.productVariant.findMany({
          where: { id: { in: ids } },
          include: { product: { select: { productName: true } }, attributes: { orderBy: { id: "asc" } } },
        });
        const nameOf = new Map(
          details.map((d) => {
            const vn = d.attributes.map((a) => a.value).join(" / ");
            return [d.id, vn ? `${d.product.productName} - ${vn}` : d.product.productName] as const;
          }),
        );

        let total = dec(0);
        let itemDiscounts = dec(0);
        const items: Prisma.SaleItemCreateWithoutSaleInput[] = [];
        for (const id of ids) {
          const row = byId.get(id);
          const line = lines.get(id)!;
          const name = nameOf.get(id);
          if (!row || !name) throw badRequest(`Product variant ${id} is not available`);
          if (row.stock < line.qty) throw conflict(`Insufficient stock for "${name}": ${row.stock} available, ${line.qty} requested`);

          const unit = dec(String(row.price));
          const gross = money(unit.mul(line.qty));
          const discount = money(dec(line.discount));
          if (discount.gt(gross)) throw badRequest(`Discount for "${name}" cannot exceed the line total`);
          total = total.add(gross);
          itemDiscounts = itemDiscounts.add(discount);
          items.push({
            variant: { connect: { id } },
            productVariantName: name,
            quantity: line.qty,
            unitPrice: unit,
            discountAmount: discount,
            totalPrice: gross.sub(discount),
          });
        }

        const saleDiscount = money(dec(body.discountAmount));
        if (saleDiscount.gt(total.sub(itemDiscounts))) throw badRequest("Discount cannot exceed the sale total");
        const discountAmount = itemDiscounts.add(saleDiscount);

        const sale = await tx.sale.create({
          data: {
            customerId: customer?.id ?? null,
            customerName: customer ? customer.fullName : body.customerName || null,
            customerNumber: customer ? customer.contactNumber || null : body.customerNumber || null,
            paymentMethod: body.paymentMethod,
            totalAmount: total,
            discountAmount,
            finalAmount: total.sub(discountAmount),
            createdById: user.id,
            items: { create: items },
          },
        });

        for (const id of ids) {
          const line = lines.get(id)!;
          const previous = byId.get(id)!.stock;
          await tx.productVariant.update({ where: { id }, data: { stock: { decrement: line.qty } } });
          await tx.stockAdjustmentLog.create({
            data: {
              variantId: id,
              adjustmentType: "Remove",
              quantity: line.qty,
              previousStock: previous,
              newStock: previous - line.qty,
              reason: `Sale #${sale.id}`,
            },
          });
        }
        return sale.id;
      });

      const full = await prisma.sale.findUniqueOrThrow({ where: { id: saleId }, include: saleInclude });
      return ok(saleDto(full), "Sale recorded successfully", 201);
    },
  }),

  route({
    method: "get",
    path: "/GetAllSales",
    summary: "All sales, newest first (includes completed custom orders, read-only)",
    access: "authenticated",
    handler: async () => {
      const [sales, orders] = await Promise.all([
        prisma.sale.findMany({ orderBy: [{ saleDate: "desc" }, { id: "desc" }], include: saleInclude }),
        prisma.customOrder.findMany({
          where: { status: "Complete" },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        }),
      ]);
      const merged = [...sales.map(saleDto), ...orders.map(customOrderAsSaleDto)].sort(
        (a, b) => new Date(b.SaleDate ?? 0).getTime() - new Date(a.SaleDate ?? 0).getTime(),
      );
      return ok(merged);
    },
  }),

  route({
    method: "get",
    path: "/GetSaleDetails/:id",
    summary: "One sale with its items",
    access: "authenticated",
    handler: async ({ params }) => {
      const sale = await prisma.sale.findUnique({ where: { id: parseId(params.id) }, include: saleInclude });
      if (!sale) throw notFound("Sale not found");
      return ok(saleDto(sale));
    },
  }),

  route({
    method: "get",
    path: "/GetDashboardStats",
    summary: "Sales totals",
    access: "authenticated",
    handler: async () => ok(await getSalesStats()),
  }),

  route({
    method: "delete",
    path: "/DeleteSale/:id",
    summary: "Delete a sale and return its items to stock",
    access: MANAGE,
    handler: async ({ params }) => {
      const id = parseId(params.id);
      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
        if (!sale) throw notFound("Sale not found");
        const sorted = [...sale.items].sort((a, b) => a.productVariantId - b.productVariantId);
        for (const item of sorted) {
          const [row] = await tx.$queryRaw<{ stock: number }[]>(
            Prisma.sql`SELECT stock FROM "ProductVariant" WHERE id = ${item.productVariantId} FOR UPDATE`,
          );
          await tx.productVariant.update({ where: { id: item.productVariantId }, data: { stock: { increment: item.quantity } } });
          await tx.stockAdjustmentLog.create({
            data: {
              variantId: item.productVariantId,
              adjustmentType: "Add",
              quantity: item.quantity,
              previousStock: row.stock,
              newStock: row.stock + item.quantity,
              reason: `Sale #${id} deleted`,
            },
          });
        }
        await tx.sale.delete({ where: { id } });
      });
      return ok(null, "Sale deleted");
    },
  }),
]);
