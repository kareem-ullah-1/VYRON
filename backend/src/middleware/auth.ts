import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../generated/prisma/client";
import { forbidden, unauthorized } from "../lib/http";
import { prisma } from "../lib/prisma";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: { id: string; role: Role }) {
  const expiresInSeconds = Math.round(env.JWT_EXPIRES_IN_HOURS * 3600);
  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: expiresInSeconds,
    algorithm: "HS256",
  });
  return { token, expires: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
}

async function resolveUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  let sub: string | undefined;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    sub = typeof payload === "object" ? payload.sub : undefined;
  } catch {
    return null;
  }
  if (!sub) return null;
  // Re-read the user so deactivation, deletion and role changes take effect immediately.
  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) throw unauthorized("Invalid or expired token");
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Attaches `req.user` when a valid token is present but never rejects. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRoles = (roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
  next();
};
