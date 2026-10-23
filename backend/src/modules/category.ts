import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { conflict, ok, parseId } from "../lib/http";
import { iso } from "../lib/format";
import { text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { prisma } from "../lib/prisma";

type CategoryRow = { id: number; name: string; description: string; isActive: boolean; createdAt: Date; updatedAt: Date };

// The frontend has two slices reading this endpoint: one expects PascalCase, the other camelCase. Both are sent.
export const categoryDto = (c: CategoryRow) => ({
  Id: c.id,
  Name: c.name,
  Description: c.description,
  IsActive: c.isActive,
  CreatedAt: iso(c.createdAt),
  UpdatedAt: iso(c.updatedAt),
  id: c.id,
  name: c.name,
  description: c.description,
  isActive: c.isActive,
});

const body = z.object({
  name: text(100).min(1, "Category name is required"),
  description: text(500).optional().default(""),
});

const WRITE: Role[] = [Role.Admin, Role.Manager];

export const router = controller("Category", [
  route({
    method: "get",
    path: "/GetCategories",
    summary: "List categories",
    access: "authenticated",
    handler: async () => {
      const rows = await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
      return ok(rows.map(categoryDto));
    },
  }),
  route({
    method: "post",
    path: "/AddCategory",
    summary: "Create a category",
    access: WRITE,
    body,
    handler: async ({ body }) => {
      const created = await prisma.category.create({ data: body });
      return ok(categoryDto(created), "Category created", 201);
    },
  }),
  route({
    method: "put",
    path: "/UpdateCategory/:id",
    summary: "Update a category",
    access: WRITE,
    body,
    handler: async ({ params, body }) => {
      const updated = await prisma.category.update({ where: { id: parseId(params.id) }, data: body });
      return ok(categoryDto(updated), "Category updated");
    },
  }),
  route({
    method: "delete",
    path: "/DeleteCategory/:id",
    summary: "Delete a category that has no products",
    access: WRITE,
    handler: async ({ params }) => {
      const id = parseId(params.id);
      const inUse = await prisma.product.count({ where: { categoryId: id } });
      if (inUse > 0) throw conflict(`Category is used by ${inUse} product(s) and cannot be deleted`);
      await prisma.category.delete({ where: { id } });
      return ok(null, "Category deleted");
    },
  }),
]);
