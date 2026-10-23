import "dotenv/config";
import bcrypt from "bcryptjs";
import { env } from "../src/config/env";
import { Role } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

const codeFor = (id: number) => `PRD-${String(id).padStart(5, "0")}`;

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Admin: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set - skipped (the first signup becomes Admin)");
    return;
  }
  if (password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");

  if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`Admin: ${email} already exists`);
    return;
  }
  await prisma.user.create({
    data: {
      name: process.env.SEED_ADMIN_NAME?.trim() || "Admin",
      email,
      role: Role.Admin,
      passwordHash: await bcrypt.hash(password, env.BCRYPT_ROUNDS),
    },
  });
  console.log(`Admin: created ${email}`);
}

async function seedSampleData() {
  if ((await prisma.product.count()) > 0) {
    console.log("Sample data: products already exist - skipped");
    return;
  }

  const categoryDefs = [
    { name: "Notebooks", description: "Ruled and plain notebooks" },
    { name: "Diaries", description: "Daily and pocket diaries" },
    { name: "Registers", description: "Office and accounting registers" },
    { name: "Stationery", description: "Pens, files and general stationery" },
  ];
  const categories = new Map<string, number>();
  for (const c of categoryDefs) {
    const row = await prisma.category.upsert({ where: { name: c.name }, update: {}, create: c });
    categories.set(c.name, row.id);
  }

  const attributeDefs = [
    { name: "Language", values: ["Urdu", "English"] },
    { name: "Ruling", values: ["4 Line", "Narrow Line", "Box", "Plain"] },
    { name: "Pages", values: ["100", "200", "300"] },
  ];
  const attributes = new Map<string, number>();
  for (const a of attributeDefs) {
    const row = await prisma.attribute.upsert({
      where: { name: a.name },
      update: {},
      create: { name: a.name, values: a.values, type: "Option" },
    });
    attributes.set(a.name, row.id);
  }

  type V = { price: number; stock: number; attrs: Record<string, string> };
  const products: { name: string; roman?: string; description: string; category: string; barcode: string; variants: V[] }[] = [
    {
      name: "Action Notebook",
      roman: "Action Copy",
      description: "Soft cover notebook",
      category: "Notebooks",
      barcode: "8960000000011",
      variants: [
        { price: 120, stock: 150, attrs: { Language: "Urdu", Ruling: "Narrow Line", Pages: "100" } },
        { price: 120, stock: 120, attrs: { Language: "English", Ruling: "4 Line", Pages: "100" } },
        { price: 220, stock: 80, attrs: { Language: "English", Ruling: "4 Line", Pages: "200" } },
      ],
    },
    {
      name: "Exam Notebook",
      roman: "Imtihan Copy",
      description: "Box ruled exam notebook",
      category: "Notebooks",
      barcode: "8960000000028",
      variants: [
        { price: 90, stock: 200, attrs: { Ruling: "Box", Pages: "100" } },
        { price: 150, stock: 6, attrs: { Ruling: "Plain", Pages: "100" } },
      ],
    },
    {
      name: "Executive Diary 2027",
      roman: "Diary 2027",
      description: "Hard cover daily diary",
      category: "Diaries",
      barcode: "8960000000035",
      variants: [
        { price: 650, stock: 40, attrs: { Language: "English" } },
        { price: 600, stock: 3, attrs: { Language: "Urdu" } },
      ],
    },
    {
      name: "Cash Book Register",
      description: "Accounting register, hard bound",
      category: "Registers",
      barcode: "8960000000042",
      variants: [
        { price: 450, stock: 30, attrs: { Pages: "200" } },
        { price: 650, stock: 18, attrs: { Pages: "300" } },
      ],
    },
    {
      name: "Gel Pen Blue",
      description: "0.7mm gel pen",
      category: "Stationery",
      barcode: "8960000000059",
      variants: [{ price: 30, stock: 500, attrs: {} }],
    },
  ];

  for (const p of products) {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          productName: p.name,
          romanUrduName: p.roman ?? null,
          description: p.description,
          productBarCode: p.barcode,
          productCode: `TMP-${crypto.randomUUID()}`,
          categoryId: categories.get(p.category)!,
        },
      });
      await tx.product.update({ where: { id: product.id }, data: { productCode: codeFor(product.id) } });

      for (const v of p.variants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            price: v.price,
            stock: v.stock,
            attributes: {
              create: Object.entries(v.attrs).map(([name, value]) => ({ attributeId: attributes.get(name)!, value })),
            },
          },
        });
        await tx.stockAdjustmentLog.create({
          data: {
            variantId: variant.id,
            adjustmentType: "Set",
            quantity: v.stock,
            previousStock: 0,
            newStock: v.stock,
            reason: "Opening stock (seed)",
          },
        });
      }
    });
  }

  if ((await prisma.customer.count()) === 0) {
    await prisma.customer.createMany({
      data: [
        { fullName: "Ahmed Khan", email: "ahmed@example.com", contactNumber: "03001234567", fullAddress: "Main Bazaar, D Ground", city: "Faisalabad", state: "Punjab", country: "Pakistan" },
        { fullName: "Bilal Traders", email: "bilal@example.com", contactNumber: "03217654321", fullAddress: "Kareem Town", city: "Faisalabad", state: "Punjab", country: "Pakistan" },
        { fullName: "Sara Book Depot", email: "", contactNumber: "03331112223", fullAddress: "Jhang Road", city: "Faisalabad", state: "Punjab", country: "Pakistan" },
      ],
    });
  }

  if ((await prisma.supplier.count()) === 0) {
    await prisma.supplier.createMany({
      data: [
        { name: "Punjab Paper Mills", email: "sales@punjabpaper.example", phone: "0412345678", address: "Industrial Estate, Faisalabad" },
        { name: "Star Card & Binding", email: "", phone: "03451234567", address: "Montgomery Bazaar, Faisalabad" },
      ],
    });
  }

  if ((await prisma.rawMaterial.count()) === 0) {
    await prisma.rawMaterial.createMany({
      data: [
        { name: "Paper 70gsm", description: "White offset paper", unitOfMeasure: "ream", currentStockQuantity: 100, attributesJson: JSON.stringify({ GSM: "70" }) },
        { name: "Card 250gsm", description: "Cover board", unitOfMeasure: "sheet", currentStockQuantity: 2000, attributesJson: JSON.stringify({ GSM: "250" }) },
        { name: "Binding Thread", description: "", unitOfMeasure: "kg", currentStockQuantity: 25, attributesJson: null },
      ],
    });
  }

  console.log("Sample data: created 4 categories, 3 attributes, 5 products, 3 customers, 2 suppliers, 3 raw materials");
}

async function main() {
  await seedAdmin();
  if (process.env.SEED_SAMPLE_DATA?.trim().toLowerCase() !== "false") await seedSampleData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
