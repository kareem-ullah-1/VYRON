import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { conflict, ok, parseId } from "../lib/http";
import { iso, num } from "../lib/format";
import { text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { prisma } from "../lib/prisma";

type Row = {
  id: number; name: string; description: string; unitOfMeasure: string; currentStockQuantity: Parameters<typeof num>[0];
  attributesJson: string | null; createdAt: Date; updatedAt: Date;
};

const dto = (m: Row) => ({
  Id: m.id,
  Name: m.name,
  Description: m.description,
  UnitOfMeasure: m.unitOfMeasure,
  CurrentStockQuantity: num(m.currentStockQuantity),
  AttributesJson: m.attributesJson,
  CreatedAt: iso(m.createdAt),
  UpdatedAt: iso(m.updatedAt),
});

const body = z.object({
  name: text(150).min(1, "Material name is required"),
  description: text(500).nullish().transform((v) => v ?? ""),
  unitOfMeasure: text(50).nullish().transform((v) => v ?? ""),
  currentStockQuantity: z.coerce.number().min(0, "Stock cannot be negative").max(1e10).default(0),
  attributesJson: z
    .string()
    .max(4000)
    .nullish()
    .refine((v) => {
      if (!v) return true;
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, "attributesJson must be valid JSON")
    .transform((v) => v || null),
});

const WRITE: Role[] = [Role.Admin, Role.Manager];

export const router = controller("RawMaterial", [
  route({
    method: "get",
    path: "/GetRawMaterials",
    summary: "List raw materials",
    access: "authenticated",
    handler: async () => ok((await prisma.rawMaterial.findMany({ orderBy: { name: "asc" } })).map(dto)),
  }),
  route({
    method: "post",
    path: "/AddRawMaterial",
    summary: "Create a raw material",
    access: WRITE,
    body,
    handler: async ({ body }) => ok(dto(await prisma.rawMaterial.create({ data: body })), "Material created", 201),
  }),
  route({
    method: "put",
    path: "/UpdateRawMaterial/:id",
    summary: "Update a raw material",
    access: WRITE,
    body,
    handler: async ({ params, body }) =>
      ok(dto(await prisma.rawMaterial.update({ where: { id: parseId(params.id) }, data: body })), "Material updated"),
  }),
  route({
    method: "delete",
    path: "/DeleteRawMaterial/:id",
    summary: "Delete a raw material that was never purchased",
    access: WRITE,
    handler: async ({ params }) => {
      const id = parseId(params.id);
      const used = await prisma.purchaseDetail.count({ where: { rawMaterialId: id } });
      if (used > 0) throw conflict("Material appears in purchases and cannot be deleted");
      await prisma.rawMaterial.delete({ where: { id } });
      return ok(null, "Material deleted");
    },
  }),
]);
