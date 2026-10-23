import { z } from "zod";
import { badRequest, ok } from "../lib/http";
import { dec, iso, money, num } from "../lib/format";
import { text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { Prisma, prisma } from "../lib/prisma";
import { Role } from "../generated/prisma/client";

const include = {
  supplier: { select: { name: true } },
  details: { orderBy: { id: "asc" }, include: { rawMaterial: { select: { name: true } } } },
} satisfies Prisma.PurchaseInclude;
type PurchaseFull = Prisma.PurchaseGetPayload<{ include: typeof include }>;

const dto = (p: PurchaseFull) => ({
  Id: p.id,
  PurchaseDate: iso(p.purchaseDate),
  SupplierId: p.supplierId,
  SupplierName: p.supplier.name,
  TotalAmount: num(p.totalAmount),
  Status: p.status,
  InvoiceNumber: p.invoiceNumber,
  CreatedAt: iso(p.createdAt),
  PurchaseDetails: p.details.map((d) => ({
    Id: d.id,
    RawMaterialId: d.rawMaterialId,
    RawMaterialName: d.rawMaterial.name,
    Quantity: num(d.quantity),
    UnitPrice: num(d.unitPrice),
    SubTotal: num(d.subTotal),
    ItemSnapshotJson: d.itemSnapshotJson,
  })),
});

const addBody = z.object({
  supplierId: z.coerce.number().int().positive("Supplier is required"),
  purchaseDate: z.coerce.date().optional(),
  invoiceNumber: text(100).nullish().transform((v) => v || null),
  purchaseDetails: z
    .array(
      z.object({
        rawMaterialId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().positive("Quantity must be greater than zero").max(1e10),
        unitPrice: z.coerce.number().min(0, "Unit price cannot be negative").max(99_999_999),
      }),
    )
    .min(1, "Add at least one item")
    .max(200),
});

export const router = controller("Purchase", [
  route({
    method: "get",
    path: "/GetPurchases",
    summary: "List purchases with line items",
    access: "authenticated",
    handler: async () => {
      const rows = await prisma.purchase.findMany({ orderBy: [{ purchaseDate: "desc" }, { id: "desc" }], include });
      return ok(rows.map(dto));
    },
  }),
  route({
    method: "post",
    path: "/AddPurchase",
    summary: "Record a purchase and increase raw-material stock atomically",
    access: [Role.Admin, Role.Manager],
    body: addBody,
    handler: async ({ body }) => {
      const id = await prisma.$transaction(async (tx) => {
        if (!(await tx.supplier.findUnique({ where: { id: body.supplierId }, select: { id: true } })))
          throw badRequest("Supplier does not exist");

        const materialIds = [...new Set(body.purchaseDetails.map((d) => d.rawMaterialId))];
        const materials = await tx.rawMaterial.findMany({ where: { id: { in: materialIds } } });
        if (materials.length !== materialIds.length) throw badRequest("One or more raw materials do not exist");
        const byId = new Map(materials.map((m) => [m.id, m]));

        let total = dec(0);
        const details = body.purchaseDetails.map((d) => {
          const m = byId.get(d.rawMaterialId)!;
          const sub = money(dec(d.quantity).mul(d.unitPrice));
          total = total.add(sub);
          return {
            rawMaterialId: d.rawMaterialId,
            quantity: dec(d.quantity),
            unitPrice: dec(d.unitPrice),
            subTotal: sub,
            itemSnapshotJson: JSON.stringify({ Name: m.name, UnitOfMeasure: m.unitOfMeasure, Attributes: m.attributesJson }),
          };
        });

        const purchase = await tx.purchase.create({
          data: {
            supplierId: body.supplierId,
            purchaseDate: body.purchaseDate ?? new Date(),
            invoiceNumber: body.invoiceNumber,
            totalAmount: total,
            details: { create: details },
          },
        });
        for (const d of details)
          await tx.rawMaterial.update({ where: { id: d.rawMaterialId }, data: { currentStockQuantity: { increment: d.quantity } } });
        return purchase.id;
      });
      return ok(dto(await prisma.purchase.findUniqueOrThrow({ where: { id }, include })), "Purchase recorded", 201);
    },
  }),
]);
