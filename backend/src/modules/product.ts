import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { badRequest, notFound, ok, parseId } from "../lib/http";
import { iso, num } from "../lib/format";
import { text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { Prisma, prisma, type Tx } from "../lib/prisma";
import { storage } from "../lib/storage";

const productInclude = {
  category: true,
  variants: {
    where: { deletedAt: null },
    orderBy: { id: "asc" },
    include: { attributes: { include: { attribute: true }, orderBy: { id: "asc" } } },
  },
  images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
} satisfies Prisma.ProductInclude;

type ProductFull = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const variantName = (attrs: { value: string }[]) => attrs.map((a) => a.value).join(" / ");

const productDto = (p: ProductFull) => {
  const variants = p.variants.map((v) => {
    const name = variantName(v.attributes);
    return {
      Id: v.id,
      Price: num(v.price),
      Stock: v.stock,
      StockAvailable: v.stock,
      ProductId: v.productId,
      VariantName: name,
      Attributes: v.attributes.map((a) => ({
        Id: a.id,
        ProductVariantId: v.id,
        AttributeId: a.attributeId,
        AttributeName: a.attribute.name,
        AttributeValue: a.value,
        VariantName: name,
      })),
    };
  });
  const urls = p.images.map((i) => storage.url(i.key)!);
  return {
    Id: p.id,
    ProductName: p.productName,
    RomanUrduName: p.romanUrduName,
    Description: p.description,
    ProductCode: p.productCode,
    ProductBarCode: p.productBarCode ?? "",
    Category: p.category.name,
    CategoryId: p.categoryId,
    CreatedAt: iso(p.createdAt),
    UpdatedAt: iso(p.updatedAt),
    Variants: variants,
    Price: variants.length ? Math.min(...variants.map((v) => v.Price)) : 0,
    Stock: variants.reduce((s, v) => s + v.Stock, 0),
    StockAvailable: variants.reduce((s, v) => s + v.Stock, 0),
    ProductImages: urls,
    ProductImageKeys: p.images.map((i) => i.key),
    Image: urls[0] ?? null,
    Status: "active" as const,
    LowStockThreshold: p.lowStockThreshold,
  };
};

const variantSchema = z.object({
  id: z.number().int().min(0).optional().default(0),
  price: z.coerce.number().min(0, "Price cannot be negative").max(99_999_999),
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock cannot be negative").max(10_000_000).default(0),
  attributes: z
    .array(
      z.object({
        attributeId: z.coerce.number().int().min(0).default(0),
        attributeValue: text(100).default(""),
      }),
    )
    .default([]),
});

const productBody = z.object({
  productName: text(200).min(1, "Product name is required"),
  romanUrduName: text(200).optional().default(""),
  description: text(2000).optional().default(""),
  categoryId: z.coerce.number().int().positive("Category is required"),
  productBarCode: text(100).optional().default(""),
  variants: z.array(variantSchema).min(1, "At least one variant is required").max(200),
  /** Image URLs the user kept when editing. Omitted = leave existing images untouched. */
  existingImages: z.array(z.string()).optional(),
});

type ProductBody = z.infer<typeof productBody>;

/** Drops blank placeholder attribute rows and validates the rest against the attribute catalogue. */
async function cleanVariants(tx: Tx, variants: ProductBody["variants"]) {
  const cleaned = variants.map((v) => ({
    ...v,
    attributes: v.attributes.filter((a) => a.attributeId > 0 || a.attributeValue !== ""),
  }));
  const ids = new Set<number>();
  for (const v of cleaned) {
    const seen = new Set<number>();
    for (const a of v.attributes) {
      if (a.attributeId <= 0 || !a.attributeValue) throw badRequest("Every variant attribute needs an attribute and a value");
      if (seen.has(a.attributeId)) throw badRequest("A variant cannot use the same attribute twice");
      seen.add(a.attributeId);
      ids.add(a.attributeId);
    }
  }
  if (ids.size) {
    const found = await tx.attribute.count({ where: { id: { in: [...ids] } } });
    if (found !== ids.size) throw badRequest("One or more attributes do not exist");
  }
  return cleaned;
}

async function assertCategory(tx: Tx, id: number) {
  if (!(await tx.category.findUnique({ where: { id }, select: { id: true } }))) throw badRequest("Category does not exist");
}

const codeFor = (id: number) => `PRD-${String(id).padStart(5, "0")}`;

const WRITE: Role[] = [Role.Admin, Role.Manager];

export const router = controller("Product", [
  route({
    method: "get",
    path: "/GetProducts",
    summary: "List active products with variants",
    access: "authenticated",
    query: z.object({ search: z.string().trim().max(100).optional(), category: z.string().trim().max(100).optional() }),
    handler: async ({ query }) => {
      const where: Prisma.ProductWhereInput = { deletedAt: null };
      if (query.category) {
        const n = Number(query.category);
        where.category = Number.isInteger(n) ? { id: n } : { name: { equals: query.category, mode: "insensitive" } };
      }
      if (query.search) {
        where.OR = [
          { productName: { contains: query.search, mode: "insensitive" } },
          { romanUrduName: { contains: query.search, mode: "insensitive" } },
          { productCode: { contains: query.search, mode: "insensitive" } },
          { productBarCode: { contains: query.search, mode: "insensitive" } },
        ];
      }
      const rows = await prisma.product.findMany({ where, include: productInclude, orderBy: { productName: "asc" } });
      return ok(rows.map(productDto));
    },
  }),

  route({
    method: "post",
    path: "/AddProduct",
    summary: "Create a product (multipart: data = JSON, images = files)",
    access: WRITE,
    multipart: { jsonField: "data", files: "images" },
    body: productBody,
    handler: async ({ body, files }) => {
      const savedKeys: string[] = [];
      try {
        for (const f of files) savedKeys.push(await storage.saveImage(f, "products"));

        const id = await prisma.$transaction(async (tx) => {
          await assertCategory(tx, body.categoryId);
          const variants = await cleanVariants(tx, body.variants);

          const product = await tx.product.create({
            data: {
              productName: body.productName,
              romanUrduName: body.romanUrduName || null,
              description: body.description,
              productBarCode: body.productBarCode || null,
              productCode: `TMP-${crypto.randomUUID()}`,
              categoryId: body.categoryId,
              images: { create: savedKeys.map((key, i) => ({ key, sortOrder: i })) },
            },
          });
          await tx.product.update({ where: { id: product.id }, data: { productCode: codeFor(product.id) } });

          for (const v of variants) {
            const created = await tx.productVariant.create({
              data: {
                productId: product.id,
                price: v.price,
                stock: v.stock,
                attributes: { create: v.attributes.map((a) => ({ attributeId: a.attributeId, value: a.attributeValue })) },
              },
            });
            if (v.stock > 0)
              await tx.stockAdjustmentLog.create({
                data: {
                  variantId: created.id,
                  adjustmentType: "Add",
                  quantity: v.stock,
                  previousStock: 0,
                  newStock: v.stock,
                  reason: "Initial stock",
                },
              });
          }
          return product.id;
        });

        const full = await prisma.product.findUniqueOrThrow({ where: { id }, include: productInclude });
        return ok(productDto(full), "Product created successfully", 201);
      } catch (e) {
        await Promise.all(savedKeys.map((k) => storage.remove(k)));
        throw e;
      }
    },
  }),

  route({
    method: "put",
    path: "/UpdateProduct/:id",
    summary: "Update a product and sync its variants (multipart: data = JSON, images = new files)",
    access: WRITE,
    multipart: { jsonField: "data", files: "images" },
    body: productBody,
    handler: async ({ params, body, files }) => {
      const id = parseId(params.id);
      const savedKeys: string[] = [];
      let removedKeys: string[] = [];
      try {
        for (const f of files) savedKeys.push(await storage.saveImage(f, "products"));

        await prisma.$transaction(async (tx) => {
          const existing = await tx.product.findFirst({
            where: { id, deletedAt: null },
            include: { variants: { where: { deletedAt: null } }, images: true },
          });
          if (!existing) throw notFound("Product not found");
          await assertCategory(tx, body.categoryId);
          const variants = await cleanVariants(tx, body.variants);

          const ownIds = new Set(existing.variants.map((v) => v.id));
          for (const v of variants) if (v.id && !ownIds.has(v.id)) throw badRequest(`Variant ${v.id} does not belong to this product`);

          await tx.product.update({
            where: { id },
            data: {
              productName: body.productName,
              romanUrduName: body.romanUrduName || null,
              description: body.description,
              productBarCode: body.productBarCode || null,
              categoryId: body.categoryId,
            },
          });

          // Variants missing from the payload are soft-deleted: past sales still reference them.
          const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
          const dropIds = existing.variants.filter((v) => !keepIds.has(v.id)).map((v) => v.id);
          if (dropIds.length) await tx.productVariant.updateMany({ where: { id: { in: dropIds } }, data: { deletedAt: new Date() } });

          for (const v of variants) {
            const attrs = v.attributes.map((a) => ({ attributeId: a.attributeId, value: a.attributeValue }));
            if (v.id) {
              const current = existing.variants.find((x) => x.id === v.id)!;
              await tx.productVariant.update({
                where: { id: v.id },
                data: { price: v.price, stock: v.stock, attributes: { deleteMany: {}, create: attrs } },
              });
              if (current.stock !== v.stock)
                await tx.stockAdjustmentLog.create({
                  data: {
                    variantId: v.id,
                    adjustmentType: "Set",
                    quantity: v.stock,
                    previousStock: current.stock,
                    newStock: v.stock,
                    reason: "Edited on product form",
                  },
                });
            } else {
              const created = await tx.productVariant.create({
                data: { productId: id, price: v.price, stock: v.stock, attributes: { create: attrs } },
              });
              if (v.stock > 0)
                await tx.stockAdjustmentLog.create({
                  data: {
                    variantId: created.id,
                    adjustmentType: "Add",
                    quantity: v.stock,
                    previousStock: 0,
                    newStock: v.stock,
                    reason: "Initial stock",
                  },
                });
            }
          }

          if (body.existingImages) {
            const keepUrls = new Set(body.existingImages);
            const drop = existing.images.filter((i) => !keepUrls.has(storage.url(i.key)!));
            if (drop.length) {
              await tx.productImage.deleteMany({ where: { id: { in: drop.map((i) => i.id) } } });
              removedKeys = drop.map((i) => i.key);
            }
          }
          if (savedKeys.length) {
            const last = await tx.productImage.aggregate({ where: { productId: id }, _max: { sortOrder: true } });
            const start = (last._max.sortOrder ?? -1) + 1;
            await tx.productImage.createMany({ data: savedKeys.map((key, i) => ({ productId: id, key, sortOrder: start + i })) });
          }
        });

        await Promise.all(removedKeys.map((k) => storage.remove(k)));
        const full = await prisma.product.findUniqueOrThrow({ where: { id }, include: productInclude });
        return ok(productDto(full), "Product updated successfully");
      } catch (e) {
        await Promise.all(savedKeys.map((k) => storage.remove(k)));
        throw e;
      }
    },
  }),

  route({
    method: "delete",
    path: "/DeleteProduct/:id",
    summary: "Soft-delete a product (sales history is preserved)",
    access: WRITE,
    handler: async ({ params }) => {
      const id = parseId(params.id);
      await prisma.$transaction(async (tx) => {
        const res = await tx.product.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
        if (res.count === 0) throw notFound("Product not found");
        await tx.productVariant.updateMany({ where: { productId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      });
      return ok(null, "Product deleted successfully");
    },
  }),

  route({
    method: "post",
    path: "/AdjustStock",
    summary: "Add / Remove / Set stock for a variant",
    access: WRITE,
    camelizeBody: true,
    body: z.object({
      productVariantId: z.coerce.number().int().positive(),
      adjustmentType: z.enum(["Add", "Remove", "Set"]),
      quantity: z.coerce.number().int("Quantity must be a whole number").min(0).max(10_000_000),
      reason: text(500).optional().default(""),
      adjustedAt: z.string().optional(),
    }),
    handler: async ({ body }) => {
      const adjustedAt = body.adjustedAt ? new Date(body.adjustedAt) : new Date();
      if (Number.isNaN(adjustedAt.getTime())) throw badRequest("Invalid adjustment date");

      const result = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ stock: number }[]>(Prisma.sql`
          SELECT v.stock FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
          WHERE v.id = ${body.productVariantId} AND v."deletedAt" IS NULL AND p."deletedAt" IS NULL
          FOR UPDATE OF v`);
        if (rows.length === 0) throw notFound("Product variant not found");
        const previous = rows[0].stock;
        const next =
          body.adjustmentType === "Add" ? previous + body.quantity
          : body.adjustmentType === "Remove" ? Math.max(0, previous - body.quantity)
          : body.quantity;
        if (next > 2_000_000_000) throw badRequest("Resulting stock is too large");
        await tx.productVariant.update({ where: { id: body.productVariantId }, data: { stock: next } });
        await tx.stockAdjustmentLog.create({
          data: {
            variantId: body.productVariantId,
            adjustmentType: body.adjustmentType,
            quantity: body.quantity,
            previousStock: previous,
            newStock: next,
            reason: body.reason || null,
            adjustedAt,
          },
        });
        return { NewStock: next, PreviousStock: previous };
      });
      return ok(result, "Stock adjusted");
    },
  }),

  route({
    method: "get",
    path: "/StockHistory/:variantId",
    summary: "Stock adjustment log of a variant",
    access: "authenticated",
    handler: async ({ params }) => {
      const logs = await prisma.stockAdjustmentLog.findMany({
        where: { variantId: parseId(params.variantId, "variant id") },
        orderBy: [{ adjustedAt: "desc" }, { id: "desc" }],
        take: 500,
      });
      return ok(
        logs.map((l) => ({
          Id: l.id,
          AdjustmentType: l.adjustmentType,
          Quantity: l.quantity,
          PreviousStock: l.previousStock,
          NewStock: l.newStock,
          Reason: l.reason,
          AdjustedAt: iso(l.adjustedAt),
          CreatedAt: iso(l.createdAt),
        })),
      );
    },
  }),
]);
