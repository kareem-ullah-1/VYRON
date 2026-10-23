import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env";
import { Prisma } from "../generated/prisma/client";
import { HttpError } from "../lib/http";

const fail = (status: number, message: string, errors?: unknown) => ({
  status,
  body: { isSuccess: false, message, error: message, ...(errors ? { errors } : {}) },
});

export const notFoundHandler: RequestHandler = (req, res) => {
  const r = fail(404, `Route not found: ${req.method} ${req.originalUrl}`);
  res.status(r.status).json(r.body);
};

export const zodMessage = (e: ZodError) => {
  const errors = e.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
  const first = errors[0];
  const message = first ? (first.field ? `${first.field}: ${first.message}` : first.message) : "Validation failed";
  return { message, errors };
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let r: ReturnType<typeof fail>;

  if (err instanceof HttpError) {
    r = fail(err.status, err.message, err.details);
  } else if (err instanceof ZodError) {
    const z = zodMessage(err);
    r = fail(400, z.message, z.errors);
  } else if (err instanceof multer.MulterError) {
    r = fail(err.code === "LIMIT_FILE_SIZE" ? 413 : 400, `Upload error: ${err.message}`);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") r = fail(409, "A record with the same unique value already exists");
    else if (err.code === "P2003") r = fail(409, "This record is referenced by other data and cannot be changed");
    else if (err.code === "P2025") r = fail(404, "Record not found");
    else r = fail(500, "Database error");
  } else if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
    r = fail(400, "Malformed JSON body");
  } else if (err && typeof err === "object" && (err as { type?: string }).type === "entity.too.large") {
    r = fail(413, "Request body too large");
  } else {
    r = fail(500, "Internal server error");
  }

  if (r.status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[${req.method} ${req.originalUrl}]`, env.isProd ? (err as Error)?.message : err);
  }
  res.status(r.status).json(r.body);
};
