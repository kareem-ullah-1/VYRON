import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import type { ZodType } from "zod";
import type { Role } from "../generated/prisma/client";
import { authenticate, optionalAuthenticate, requireRoles, type AuthUser } from "../middleware/auth";
import { uploadAvatar, uploadImages } from "../middleware/upload";
import { badRequest, camelizeKeys, type Result } from "./http";

/** "public": no auth · "optional": token used when present · "authenticated": any active user · Role[]: those roles only. */
export type Access = "public" | "optional" | "authenticated" | Role[];

export interface RouteContext<B, Q> {
  req: Request;
  /** Defined for every route except "public"/"optional" access (use `req.user` there). */
  user: AuthUser;
  body: B;
  query: Q;
  params: Record<string, string>;
  files: Express.Multer.File[];
}

export interface RouteDef<B = unknown, Q = unknown> {
  method: "get" | "post" | "put" | "delete";
  /** Path relative to the controller, e.g. "/GetProducts" or "/Delete/:id". */
  path: string;
  summary: string;
  access: Access;
  body?: ZodType<B>;
  query?: ZodType<Q>;
  /** Lower-case the first letter of body keys so `{ Role }` and `{ role }` are both accepted. */
  camelizeBody?: boolean;
  /** multipart/form-data. `jsonField` = a field holding the JSON payload; `files` = which file field(s) to accept. */
  multipart?: { jsonField?: string; files: "images" | "avatar" };
  /** Extra middleware that runs first (e.g. a rate limiter). */
  pre?: RequestHandler[];
  handler: (ctx: RouteContext<B, Q>) => Promise<Result>;
}

export interface RegisteredRoute {
  tag: string;
  def: RouteDef<any, any>;
}

export const registry: RegisteredRoute[] = [];

export const route = <B = unknown, Q = unknown>(def: RouteDef<B, Q>): RouteDef<any, any> => def;

export function controller(tag: string, routes: RouteDef<any, any>[]): Router {
  const router = Router();

  for (const def of routes) {
    registry.push({ tag, def });

    const stack: RequestHandler[] = [...(def.pre ?? [])];
    if (def.access === "optional") stack.push(optionalAuthenticate);
    else if (def.access !== "public") {
      stack.push(authenticate);
      if (Array.isArray(def.access)) stack.push(requireRoles(def.access));
    }
    if (def.multipart) stack.push(def.multipart.files === "images" ? uploadImages : uploadAvatar);

    stack.push(async (req: Request, res: Response, next: NextFunction) => {
      try {
        let rawBody: unknown = req.body ?? {};
        if (def.multipart?.jsonField) {
          const text = (req.body as Record<string, unknown> | undefined)?.[def.multipart.jsonField];
          if (typeof text !== "string") throw badRequest(`Missing "${def.multipart.jsonField}" field`);
          try {
            rawBody = JSON.parse(text);
          } catch {
            throw badRequest(`"${def.multipart.jsonField}" must be valid JSON`);
          }
        }
        if (def.camelizeBody) rawBody = camelizeKeys(rawBody);

        const body = def.body ? def.body.parse(rawBody) : (rawBody as never);
        const query = def.query ? def.query.parse(req.query) : (req.query as never);

        const uploaded = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : req.file ? [req.file] : [];

        const result = await def.handler({
          req,
          user: req.user as AuthUser,
          body,
          query,
          params: req.params as Record<string, string>,
          files: uploaded,
        });
        res.status(result.status).json(result.body);
      } catch (e) {
        next(e);
      }
    });

    router[def.method](def.path, ...stack);
  }
  return router;
}
