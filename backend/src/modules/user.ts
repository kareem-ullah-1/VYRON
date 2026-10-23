import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env";
import { Role } from "../generated/prisma/client";
import { conflict, forbidden, notFound, ok } from "../lib/http";
import { normalizeEmail, parseUuid, roleSchema, ROLES } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { prisma } from "../lib/prisma";
import { storage } from "../lib/storage";

const toDto = (u: { id: string; name: string; email: string; role: Role; isActive: boolean; avatarKey: string | null }) => ({
  Id: u.id,
  Name: u.name,
  Email: u.email,
  Role: u.role,
  IsActive: u.isActive,
  Avatar: storage.url(u.avatarKey) ?? "",
});

async function getUserOr404(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User not found");
  return user;
}

/** Throws if removing/demoting/deactivating `target` would leave the system without an active Admin. */
async function assertNotLastAdmin(target: { id: string; role: Role; isActive: boolean }) {
  if (target.role !== Role.Admin || !target.isActive) return;
  const others = await prisma.user.count({ where: { role: Role.Admin, isActive: true, id: { not: target.id } } });
  if (others === 0) throw conflict("At least one active Admin must remain");
}

const ADMIN: Role[] = [Role.Admin];

export const router = controller("User", [
  route({
    method: "get",
    path: "/GetAll",
    summary: "List users",
    access: ADMIN,
    handler: async () => {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
      return ok(users.map(toDto));
    },
  }),

  route({
    method: "put",
    path: "/ToggleStatus/:id",
    summary: "Activate / deactivate a user",
    access: ADMIN,
    handler: async ({ params, user: actor }) => {
      const target = await getUserOr404(parseUuid(params.id));
      if (target.id === actor.id) throw forbidden("You cannot deactivate your own account");
      await assertNotLastAdmin(target);
      const updated = await prisma.user.update({ where: { id: target.id }, data: { isActive: !target.isActive } });
      return ok(toDto(updated), updated.isActive ? "User activated" : "User deactivated");
    },
  }),

  route({
    method: "put",
    path: "/UpdateRole/:id",
    summary: "Change a user's role",
    access: ADMIN,
    camelizeBody: true,
    body: z.object({ role: roleSchema }),
    handler: async ({ params, body }) => {
      const target = await getUserOr404(parseUuid(params.id));
      if (target.role !== body.role) await assertNotLastAdmin(target);
      const updated = await prisma.user.update({ where: { id: target.id }, data: { role: body.role } });
      return ok(toDto(updated), "Role updated");
    },
  }),

  route({
    method: "put",
    path: "/Update/:id",
    summary: "Update a user's name, e-mail and role",
    access: ADMIN,
    camelizeBody: true,
    body: z.object({
      name: z.string().trim().min(1, "Name is required").max(100),
      email: z.string().trim().email("Invalid email address").max(254),
      role: roleSchema,
    }),
    handler: async ({ params, body }) => {
      const target = await getUserOr404(parseUuid(params.id));
      if (target.role !== body.role) await assertNotLastAdmin(target);
      const email = normalizeEmail(body.email);
      const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (clash && clash.id !== target.id) throw conflict("An account with this email already exists");
      const updated = await prisma.user.update({
        where: { id: target.id },
        data: { name: body.name, email, role: body.role },
      });
      return ok(toDto(updated), "User updated");
    },
  }),

  route({
    method: "put",
    path: "/ResetPassword/:id",
    summary: "Set a new password for a user",
    access: ADMIN,
    camelizeBody: true,
    body: z.object({ newPassword: z.string().min(8, "Password must be at least 8 characters").max(200) }),
    handler: async ({ params, body }) => {
      const target = await getUserOr404(parseUuid(params.id));
      await prisma.user.update({
        where: { id: target.id },
        data: { passwordHash: await bcrypt.hash(body.newPassword, env.BCRYPT_ROUNDS) },
      });
      return ok(null, "Password reset");
    },
  }),

  route({
    method: "delete",
    path: "/Delete/:id",
    summary: "Delete a user",
    access: ADMIN,
    handler: async ({ params, user: actor }) => {
      const target = await getUserOr404(parseUuid(params.id));
      if (target.id === actor.id) throw forbidden("You cannot delete your own account");
      await assertNotLastAdmin(target);
      await prisma.user.delete({ where: { id: target.id } });
      await storage.remove(target.avatarKey);
      return ok(null, "User deleted");
    },
  }),

  route({
    method: "put",
    path: "/UpdateProfile",
    summary: "Update own name and avatar (multipart: Name, Avatar)",
    access: "authenticated",
    camelizeBody: true,
    multipart: { files: "avatar" },
    body: z.object({ name: z.string().trim().min(1, "Name is required").max(100) }),
    handler: async ({ user, body, files }) => {
      const current = await getUserOr404(user.id);
      let avatarKey = current.avatarKey;
      let newKey: string | null = null;
      if (files[0]) {
        newKey = await storage.saveImage(files[0], "avatars");
        avatarKey = newKey;
      }
      try {
        const updated = await prisma.user.update({ where: { id: user.id }, data: { name: body.name, avatarKey } });
        if (newKey) await storage.remove(current.avatarKey);
        return ok({ name: updated.name, avatar: storage.url(updated.avatarKey) ?? "" }, "Profile updated");
      } catch (e) {
        if (newKey) await storage.remove(newKey);
        throw e;
      }
    },
  }),
]);

export const rolesRouter = controller("Roles", [
  route({
    method: "get",
    path: "/",
    summary: "List assignable roles",
    access: ADMIN,
    handler: async () => ok(ROLES.map((r) => ({ Id: r, Name: r }))),
  }),
]);
