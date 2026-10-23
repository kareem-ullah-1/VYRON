import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { Prisma, Role } from "../generated/prisma/client";
import { forbidden, conflict, ok, unauthorized } from "../lib/http";
import { normalizeEmail, roleSchema } from "../lib/helpers";
import { controller, route } from "../lib/route";
import { prisma } from "../lib/prisma";
import { storage } from "../lib/storage";
import { signToken } from "../middleware/auth";

// Compared against when the e-mail is unknown so response time does not reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", env.BCRYPT_ROUNDS);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    const message = "Too many login attempts. Please try again later.";
    res.status(429).json({ isSuccess: false, message, error: message });
  },
});

const loginBody = z.object({
  email: z.string().trim().min(1, "Email is required").max(254),
  password: z.string().min(1, "Password is required").max(200),
});

const loginResponse = (user: { id: string; name: string; email: string; avatarKey: string | null; role: Role }) => {
  const { token, expires } = signToken(user);
  return {
    token,
    expires,
    userId: user.id,
    username: user.name,
    name: user.name,
    email: user.email,
    avatar: storage.url(user.avatarKey) ?? "",
    role: user.role,
  };
};

const registerBody = z.object({
  username: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email("Invalid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  confirmPassword: z.string().optional(),
  role: roleSchema.optional(),
});

export const router = controller("Auth", [
  route({
    method: "post",
    path: "/login",
    summary: "Sign in with e-mail and password",
    access: "public",
    camelizeBody: true,
    pre: [loginLimiter],
    body: loginBody,
    handler: async ({ body }) => {
      const user = await prisma.user.findUnique({ where: { email: normalizeEmail(body.email) } });
      const valid = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !valid) throw unauthorized("Invalid email or password");
      if (!user.isActive) throw forbidden("This account has been deactivated");

      return ok(loginResponse(user), "Login successful");
    },
  }),

  route({
    method: "post",
    path: "/demo-login",
    summary:
      "Public-demo sign-in with no password, for a portfolio/CV deployment. On by default (DEMO_MODE=false to require real login). Uses DEMO_USER_EMAIL if set, otherwise auto-creates a reserved demo account on first use.",
    access: "public",
    pre: [loginLimiter],
    handler: async () => {
      if (!env.DEMO_MODE) throw forbidden("Demo mode is not enabled");

      if (env.DEMO_USER_EMAIL) {
        const user = await prisma.user.findUnique({ where: { email: normalizeEmail(env.DEMO_USER_EMAIL) } });
        if (!user || !user.isActive) throw forbidden("Demo account is not available");
        return ok(loginResponse(user), "Demo login successful");
      }

      const email = "demo@portfolio.local";
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        try {
          user = await prisma.user.create({
            data: {
              name: "Portfolio Visitor",
              email,
              role: Role.Admin,
              // Not a real credential - demo-login is the only way in with this account, and it never checks a password.
              passwordHash: await bcrypt.hash(randomUUID(), env.BCRYPT_ROUNDS),
            },
          });
        } catch (e) {
          // Concurrent first requests race on the unique e-mail: the loser just reads the winner's row.
          if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
          user = await prisma.user.findUnique({ where: { email } });
          if (!user) throw e;
        }
      }
      if (!user.isActive) throw forbidden("Demo account is not available");

      return ok(loginResponse(user), "Demo login successful");
    },
  }),

  route({
    method: "post",
    path: "/register",
    summary: "Create an account (first account / Admin / when ALLOW_PUBLIC_SIGNUP=true)",
    access: "optional",
    camelizeBody: true,
    body: registerBody,
    handler: async ({ req, body }) => {
      if (body.confirmPassword !== undefined && body.confirmPassword !== body.password)
        throw forbidden("Passwords do not match");

      const actor = req.user;
      const userCount = await prisma.user.count();
      const bootstrap = userCount === 0;
      const byAdmin = actor?.role === Role.Admin;
      if (!bootstrap && !byAdmin && !env.ALLOW_PUBLIC_SIGNUP)
        throw forbidden("Registration is disabled. Ask an administrator to create your account.");

      const email = normalizeEmail(body.email);
      if (await prisma.user.findUnique({ where: { email }, select: { id: true } }))
        throw conflict("An account with this email already exists");

      const role = bootstrap ? Role.Admin : byAdmin ? (body.role ?? Role.Cashier) : Role.Cashier;
      const created = await prisma.user.create({
        data: {
          name: body.username ?? email.split("@")[0],
          email,
          role,
          passwordHash: await bcrypt.hash(body.password, env.BCRYPT_ROUNDS),
        },
      });

      const data: Record<string, unknown> = {
        userId: created.id,
        username: created.name,
        email: created.email,
        role: created.role,
      };
      // Only self-service sign-ups get a session; an admin creating a user must not receive that user's token.
      if (!byAdmin) Object.assign(data, signToken(created));
      return ok(data, "Account created successfully", 201);
    },
  }),
]);
