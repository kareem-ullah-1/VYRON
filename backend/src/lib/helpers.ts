import { z } from "zod";
import { Role } from "../generated/prisma/client";
import { badRequest } from "./http";

export const ROLES = Object.values(Role) as Role[];

/** Case-insensitive role name -> enum value ("admin" -> "Admin"). */
export const roleSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const role = ROLES.find((r) => r.toLowerCase() === v.toLowerCase());
    if (!role) {
      ctx.addIssue({ code: "custom", message: `Role must be one of: ${ROLES.join(", ")}` });
      return z.NEVER;
    }
    return role;
  });

export const normalizeEmail = (v: string) => v.trim().toLowerCase();

/** Optional contact e-mail: empty string or a valid address. */
export const optionalEmail = z
  .union([z.literal(""), z.string().trim().email("Invalid email address")])
  .optional()
  .transform((v) => v ?? "");

export const text = (max: number) => z.string().trim().max(max);

export function parseUuid(raw: string | undefined, label = "id"): string {
  const ok = z.string().uuid().safeParse(raw);
  if (!ok.success) throw badRequest(`Invalid ${label}`);
  return ok.data;
}
