import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { conflict, ok, parseId } from "../lib/http";
import { text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { prisma } from "../lib/prisma";

type AttributeRow = { id: number; name: string; type: string; values: string[]; isActive: boolean };

// ProductScreen reads lower-case keys, the Redux slice reads PascalCase. Both are sent.
const attributeDto = (a: AttributeRow) => ({
  Id: a.id,
  Name: a.name,
  Type: a.type,
  Values: a.values,
  IsActive: a.isActive,
  type: a.type,
  values: a.values,
  isActive: a.isActive,
});

const body = z.object({
  name: text(100).min(1, "Attribute name is required"),
  type: text(50).optional().default("Option"),
  values: z
    .array(text(100))
    .transform((v) => [...new Set(v.filter(Boolean))])
    .refine((v) => v.length > 0, "At least one value is required"),
  isActive: z.boolean().optional().default(true),
});

const WRITE: Role[] = [Role.Admin, Role.Manager];

export const router = controller("Attributes", [
  route({
    method: "get",
    path: "/GetAllAttributes",
    summary: "List attributes",
    access: "authenticated",
    handler: async () => {
      const rows = await prisma.attribute.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
      return ok(rows.map(attributeDto));
    },
  }),
  route({
    method: "post",
    path: "/CreateAttribute",
    summary: "Create an attribute",
    access: WRITE,
    camelizeBody: true,
    body,
    handler: async ({ body }) => ok(attributeDto(await prisma.attribute.create({ data: body })), "Attribute created", 201),
  }),
  route({
    method: "put",
    path: "/UpdateAttribute/:id",
    summary: "Update an attribute",
    access: WRITE,
    camelizeBody: true,
    body,
    handler: async ({ params, body }) =>
      ok(attributeDto(await prisma.attribute.update({ where: { id: parseId(params.id) }, data: body })), "Attribute updated"),
  }),
  route({
    method: "delete",
    path: "/DeleteAttribute/:id",
    summary: "Delete an attribute that no variant uses",
    access: WRITE,
    handler: async ({ params }) => {
      const id = parseId(params.id);
      const inUse = await prisma.productVariantAttribute.count({ where: { attributeId: id } });
      if (inUse > 0) throw conflict("Attribute is used by existing product variants and cannot be deleted");
      await prisma.attribute.delete({ where: { id } });
      return ok(null, "Attribute deleted");
    },
  }),
]);
