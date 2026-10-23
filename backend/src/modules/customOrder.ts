import { z } from "zod";
import { badRequest, conflict, notFound, ok, parseId } from "../lib/http";
import { dec, iso, money, num } from "../lib/format";
import { text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { Prisma, prisma, type Tx } from "../lib/prisma";

const include = {
  statusHistory: { orderBy: [{ changedAt: "asc" }, { id: "asc" }] },
  payments: { orderBy: [{ paidAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.CustomOrderInclude;
type OrderFull = Prisma.CustomOrderGetPayload<{ include: typeof include }>;

const orderDto = (o: OrderFull) => ({
  Id: o.id,
  OrderNumber: o.orderNumber,
  OrderType: o.orderType,
  CustomerId: o.customerId,
  CustomerName: o.customerName,
  CustomerContact: o.customerContact,
  CustomerAddress: o.customerAddress,
  StaffId: o.staffId,
  StaffName: o.staffName,
  Description: o.description,
  DeliveryType: o.deliveryType,
  DeliveryDate: iso(o.deliveryDate),
  TotalAmount: num(o.totalAmount),
  PaidAmount: num(o.paidAmount),
  RemainingBalance: num(o.totalAmount.sub(o.paidAmount)),
  PaymentMethod: o.paymentMethod,
  Status: o.status,
  Blocks: o.blocks,
  StatusHistory: o.statusHistory.map((h) => ({
    Status: h.status,
    ChangedAt: iso(h.changedAt),
    ChangedByUserId: h.changedByUserId,
    ChangedByName: h.changedByName,
    Note: h.note,
  })),
  PaymentHistory: o.payments.map((p) => ({
    Amount: num(p.amount),
    PaymentMethod: p.paymentMethod,
    PaidAt: iso(p.paidAt),
    ReceivedByUserId: p.receivedByUserId,
    ReceivedByName: p.receivedByName,
    Note: p.note,
  })),
  Attachments: [] as string[],
  CreatedAt: iso(o.createdAt),
  UpdatedAt: iso(o.updatedAt),
});

const itemSchema = z.object({
  Name: text(200).min(1, "All items must have a name"),
  Qty: z.coerce.number().positive("All items must have quantity > 0").max(1e9),
  Price: z.coerce.number().min(0, "Item price cannot be negative").max(1e9),
  Notes: text(500).nullish().transform((v) => v ?? null),
});

// Notebook / Diary detail objects are opaque to the server: they are stored and returned as sent.
const blockSchema = z.object({
  BlockType: z.enum(["Custom", "Notebook", "Diary"]),
  Items: z.array(itemSchema).min(1, "Every block needs at least one item"),
  NotebookDetails: z.record(z.string(), z.unknown()).nullish().transform((v) => v ?? null),
  DiaryDetails: z.record(z.string(), z.unknown()).nullish().transform((v) => v ?? null),
});

const dateField = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid delivery date" });
      return z.NEVER;
    }
    return d;
  });

const blocksField = z.array(blockSchema).min(1, "Add at least one block").max(50);

const createBody = z.object({
  CustomerId: z.coerce.number().int().positive().nullish(),
  CustomerName: text(150).nullish(),
  CustomerContact: text(50).nullish(),
  CustomerAddress: text(300).nullish(),
  Description: text(2000).nullish(),
  DeliveryType: text(50).nullish(),
  DeliveryDate: dateField,
  PaidAmount: z.coerce.number().min(0).max(1e10).default(0),
  PaymentMethod: text(50).nullish(),
  Blocks: blocksField,
});

const updateBody = z.object({
  Description: text(2000).nullish(),
  DeliveryType: text(50).nullish(),
  DeliveryDate: dateField,
  Blocks: blocksField,
});

type Blocks = z.infer<typeof blocksField>;

const totalOf = (blocks: Blocks) =>
  money(blocks.reduce((sum, b) => b.Items.reduce((s, i) => s.add(dec(i.Qty).mul(i.Price)), sum), dec(0)));

const typeOf = (blocks: Blocks) => {
  const types = [...new Set(blocks.map((b) => b.BlockType))];
  return types.length === 1 ? types[0] : "Mixed";
};

/** Row-locks the order so concurrent payments / status changes are serialised. */
async function lockOrder(tx: Tx, id: number) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "CustomOrder" WHERE id = ${id} FOR UPDATE`);
  const order = await tx.customOrder.findUnique({ where: { id } });
  if (!order) throw notFound("Order not found");
  return order;
}

const load = (id: number) => prisma.customOrder.findUniqueOrThrow({ where: { id }, include });

export const router = controller("CustomOrder", [
  route({
    method: "get",
    path: "/GetAllOrders",
    summary: "All custom orders, newest first",
    access: "authenticated",
    handler: async () => {
      const rows = await prisma.customOrder.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], include });
      return ok(rows.map(orderDto));
    },
  }),

  route({
    method: "get",
    path: "/GetOrder/:id",
    summary: "One custom order",
    access: "authenticated",
    handler: async ({ params }) => {
      const order = await prisma.customOrder.findUnique({ where: { id: parseId(params.id) }, include });
      if (!order) throw notFound("Order not found");
      return ok(orderDto(order));
    },
  }),

  route({
    method: "post",
    path: "/CreateOrder",
    summary: "Create a custom order (optionally with an advance payment)",
    access: "authenticated",
    body: createBody,
    handler: async ({ body, user }) => {
      const total = totalOf(body.Blocks);
      const paid = money(dec(body.PaidAmount));
      if (paid.gt(total)) throw badRequest("Paid amount cannot exceed total");
      if (paid.gt(0) && !body.PaymentMethod) throw badRequest("Payment method is required when an amount is paid");

      const id = await prisma.$transaction(async (tx) => {
        let name = body.CustomerName?.trim() || null;
        let contact = body.CustomerContact || null;
        let address = body.CustomerAddress || null;
        if (body.CustomerId) {
          const c = await tx.customer.findFirst({ where: { id: body.CustomerId, isActive: true } });
          if (!c) throw badRequest("Customer not found");
          name = c.fullName;
          contact = c.contactNumber || null;
          address = c.fullAddress || null;
        } else if (!name) {
          throw badRequest("Please select a customer or enter a name");
        }

        const order = await tx.customOrder.create({
          data: {
            orderNumber: `TMP-${crypto.randomUUID()}`,
            orderType: typeOf(body.Blocks),
            customerId: body.CustomerId ?? null,
            customerName: name,
            customerContact: contact,
            customerAddress: address,
            staffId: user.id,
            staffName: user.name,
            description: body.Description ?? null,
            deliveryType: body.DeliveryType ?? null,
            deliveryDate: body.DeliveryDate,
            totalAmount: total,
            paidAmount: paid,
            paymentMethod: paid.gt(0) ? body.PaymentMethod : null,
            blocks: body.Blocks as Prisma.InputJsonValue,
            statusHistory: { create: { status: "Pending", changedByUserId: user.id, changedByName: user.name, note: "Order created" } },
            ...(paid.gt(0)
              ? {
                  payments: {
                    create: {
                      amount: paid,
                      paymentMethod: body.PaymentMethod!,
                      receivedByUserId: user.id,
                      receivedByName: user.name,
                      note: "Advance payment",
                    },
                  },
                }
              : {}),
          },
        });
        await tx.customOrder.update({
          where: { id: order.id },
          data: { orderNumber: `CO-${String(order.id).padStart(6, "0")}` },
        });
        return order.id;
      });
      return ok(orderDto(await load(id)), "Order created", 201);
    },
  }),

  route({
    method: "put",
    path: "/UpdateOrder/:id",
    summary: "Edit a Pending order",
    access: "authenticated",
    body: updateBody,
    handler: async ({ params, body }) => {
      const id = parseId(params.id);
      await prisma.$transaction(async (tx) => {
        const order = await lockOrder(tx, id);
        if (order.status !== "Pending") throw conflict("Only Pending orders can be edited");
        const total = totalOf(body.Blocks);
        if (order.paidAmount.gt(total)) throw conflict("New total is lower than the amount already paid");
        await tx.customOrder.update({
          where: { id },
          data: {
            orderType: typeOf(body.Blocks),
            description: body.Description ?? null,
            deliveryType: body.DeliveryType ?? null,
            deliveryDate: body.DeliveryDate,
            totalAmount: total,
            blocks: body.Blocks as Prisma.InputJsonValue,
          },
        });
      });
      return ok(orderDto(await load(id)), "Order updated");
    },
  }),

  route({
    method: "put",
    path: "/UpdateStatus/:id",
    summary: "Advance an order: Pending -> Delivered -> Complete (needs zero balance)",
    access: "authenticated",
    body: z.object({ Status: z.enum(["Delivered", "Complete"]), Note: text(500).nullish() }),
    handler: async ({ params, body, user }) => {
      const id = parseId(params.id);
      await prisma.$transaction(async (tx) => {
        const order = await lockOrder(tx, id);
        const expectedFrom = body.Status === "Delivered" ? "Pending" : "Delivered";
        if (order.status !== expectedFrom)
          throw conflict(`Cannot mark a ${order.status} order as ${body.Status}`);
        if (body.Status === "Complete" && order.paidAmount.lt(order.totalAmount))
          throw conflict("Collect the remaining balance before completing the order");
        await tx.customOrder.update({ where: { id }, data: { status: body.Status } });
        await tx.customOrderStatusHistory.create({
          data: { orderId: id, status: body.Status, changedByUserId: user.id, changedByName: user.name, note: body.Note || null },
        });
      });
      return ok(orderDto(await load(id)), `Order marked ${body.Status}`);
    },
  }),

  route({
    method: "post",
    path: "/AddPayment/:id",
    summary: "Record a payment against the remaining balance",
    access: "authenticated",
    body: z.object({
      Amount: z.coerce.number().positive("Amount must be greater than zero").max(1e10),
      PaymentMethod: text(50).min(1, "Payment method is required"),
      Note: text(500).nullish(),
    }),
    handler: async ({ params, body, user }) => {
      const id = parseId(params.id);
      await prisma.$transaction(async (tx) => {
        const order = await lockOrder(tx, id);
        const amount = money(dec(body.Amount));
        if (amount.gt(order.totalAmount.sub(order.paidAmount))) throw badRequest("Amount cannot exceed the remaining balance");
        await tx.customOrderPayment.create({
          data: {
            orderId: id,
            amount,
            paymentMethod: body.PaymentMethod,
            receivedByUserId: user.id,
            receivedByName: user.name,
            note: body.Note || null,
          },
        });
        await tx.customOrder.update({
          where: { id },
          data: { paidAmount: { increment: amount }, paymentMethod: body.PaymentMethod },
        });
      });
      return ok(orderDto(await load(id)), "Payment recorded");
    },
  }),

  route({
    method: "delete",
    path: "/DeleteOrder/:id",
    summary: "Delete a Pending order",
    access: "authenticated",
    handler: async ({ params }) => {
      const id = parseId(params.id);
      await prisma.$transaction(async (tx) => {
        const order = await lockOrder(tx, id);
        if (order.status !== "Pending") throw conflict("Only Pending orders can be deleted");
        await tx.customOrder.delete({ where: { id } });
      });
      return ok(null, "Order deleted");
    },
  }),
]);
