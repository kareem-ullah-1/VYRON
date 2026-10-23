import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { conflict, notFound, ok, parseId } from "../lib/http";
import { iso, num } from "../lib/format";
import { optionalEmail, text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { prisma } from "../lib/prisma";

type SupplierRow = { id: number; name: string; email: string; phone: string; address: string; createdAt: Date };

const supplierDto = (s: SupplierRow) => ({
  Id: s.id,
  Name: s.name,
  Email: s.email,
  Phone: s.phone,
  Address: s.address,
  CreatedAt: iso(s.createdAt),
});

const body = z.object({
  name: text(150).min(1, "Supplier name is required"),
  email: optionalEmail,
  phone: text(30).optional().default(""),
  address: text(300).optional().default(""),
});

const WRITE: Role[] = [Role.Admin, Role.Manager];

export const router = controller("Supplier", [
  route({
    method: "get",
    path: "/GetSuppliers",
    summary: "List suppliers",
    access: "authenticated",
    handler: async () => ok((await prisma.supplier.findMany({ orderBy: { name: "asc" } })).map(supplierDto)),
  }),
  route({
    method: "get",
    path: "/GetSupplier/:id",
    summary: "Supplier with purchase history (camelCase, as SuppliersTable reads it)",
    access: "authenticated",
    handler: async ({ params }) => {
      const s = await prisma.supplier.findUnique({
        where: { id: parseId(params.id) },
        include: {
          purchases: {
            orderBy: [{ purchaseDate: "desc" }, { id: "desc" }],
            include: { details: { orderBy: { id: "asc" }, include: { rawMaterial: { select: { name: true } } } } },
          },
        },
      });
      if (!s) throw notFound("Supplier not found");
      return ok({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        createdAt: iso(s.createdAt),
        purchases: s.purchases.map((p) => ({
          id: p.id,
          purchaseDate: iso(p.purchaseDate),
          totalAmount: num(p.totalAmount),
          status: p.status,
          invoiceNumber: p.invoiceNumber,
          items: p.details.map((d) => ({
            quantity: num(d.quantity),
            rawMaterialName: d.rawMaterial.name,
            unitPrice: num(d.unitPrice),
            subTotal: num(d.subTotal),
          })),
        })),
      });
    },
  }),
  route({
    method: "post",
    path: "/AddSupplier",
    summary: "Create a supplier",
    access: WRITE,
    body,
    handler: async ({ body }) => ok(supplierDto(await prisma.supplier.create({ data: body })), "Supplier created", 201),
  }),
  route({
    method: "put",
    path: "/UpdateSupplier/:id",
    summary: "Update a supplier",
    access: WRITE,
    body,
    handler: async ({ params, body }) =>
      ok(supplierDto(await prisma.supplier.update({ where: { id: parseId(params.id) }, data: body })), "Supplier updated"),
  }),
  route({
    method: "delete",
    path: "/DeleteSupplier/:id",
    summary: "Delete a supplier without purchases",
    access: WRITE,
    handler: async ({ params }) => {
      const id = parseId(params.id);
      const used = await prisma.purchase.count({ where: { supplierId: id } });
      if (used > 0) throw conflict(`Supplier has ${used} purchase(s) and cannot be deleted`);
      await prisma.supplier.delete({ where: { id } });
      return ok(null, "Supplier deleted");
    },
  }),
]);
