import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { notFound, ok, parseId } from "../lib/http";
import { iso } from "../lib/format";
import { optionalEmail, text } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { prisma } from "../lib/prisma";
import { saleDto, saleInclude } from "./sale";

type CustomerRow = {
  id: number; fullName: string; email: string; contactNumber: string; fullAddress: string;
  city: string; state: string; country: string; createdAt: Date; updatedAt: Date;
};

const customerDto = (c: CustomerRow) => ({
  Id: c.id,
  FullName: c.fullName,
  Email: c.email,
  ContactNumber: c.contactNumber,
  FullAddress: c.fullAddress,
  City: c.city,
  State: c.state,
  Country: c.country,
  CreatedAt: iso(c.createdAt),
  UpdatedAt: iso(c.updatedAt),
});

const body = z.object({
  fullName: text(150).min(1, "Full name is required"),
  email: optionalEmail,
  contactNumber: text(30).optional().default(""),
  fullAddress: text(300).optional().default(""),
  city: text(100).optional().default(""),
  state: text(100).optional().default(""),
  country: text(100).optional().default(""),
});

export const router = controller("Customer", [
  route({
    method: "get",
    path: "/GetAllCustomers",
    summary: "List customers",
    access: "authenticated",
    handler: async () => {
      const rows = await prisma.customer.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } });
      return ok(rows.map(customerDto));
    },
  }),
  route({
    method: "get",
    path: "/GetCustomerById/:id",
    summary: "Customer with sales history",
    access: "authenticated",
    handler: async ({ params }) => {
      const id = parseId(params.id);
      const customer = await prisma.customer.findFirst({ where: { id, isActive: true } });
      if (!customer) throw notFound("Customer not found");
      const sales = await prisma.sale.findMany({
        where: { customerId: id },
        orderBy: { saleDate: "desc" },
        include: saleInclude,
      });
      return ok({ customer: customerDto(customer), salesHistory: { data: sales.map(saleDto) } });
    },
  }),
  route({
    method: "post",
    path: "/CreateCustomer",
    summary: "Create a customer",
    access: "authenticated",
    camelizeBody: true,
    body,
    handler: async ({ body }) => ok(customerDto(await prisma.customer.create({ data: body })), "Customer created", 201),
  }),
  route({
    method: "put",
    path: "/UpdateCustomer/:id",
    summary: "Update a customer",
    access: "authenticated",
    camelizeBody: true,
    body,
    handler: async ({ params, body }) => {
      const id = parseId(params.id);
      const existing = await prisma.customer.findFirst({ where: { id, isActive: true }, select: { id: true } });
      if (!existing) throw notFound("Customer not found");
      return ok(customerDto(await prisma.customer.update({ where: { id }, data: body })), "Customer updated");
    },
  }),
  route({
    method: "delete",
    path: "/DeleteCustomer/:id",
    summary: "Deactivate a customer (sales and orders keep their history)",
    access: [Role.Admin, Role.Manager],
    handler: async ({ params }) => {
      const id = parseId(params.id);
      const result = await prisma.customer.updateMany({ where: { id, isActive: true }, data: { isActive: false } });
      if (result.count === 0) throw notFound("Customer not found");
      return ok(null, "Customer deleted");
    },
  }),
]);
