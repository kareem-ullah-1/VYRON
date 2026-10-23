import "dotenv/config";
import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const boolDefaultTrue = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5122),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z
      .string({ error: "JWT_SECRET is required (generate: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")" })
      .min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN_HOURS: z.coerce.number().positive().default(8),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    ALLOW_PUBLIC_SIGNUP: bool,
    // Public portfolio/demo mode: POST /Auth/demo-login signs visitors in with no password, so the
    // login screen never shows. ON by default (this build is meant to be a public portfolio demo) -
    // set DEMO_MODE=false to require real login instead. DEMO_USER_EMAIL is optional: if unset, a
    // single reserved demo account is auto-created the first time it's needed (no setup required).
    DEMO_MODE: boolDefaultTrue,
    DEMO_USER_EMAIL: z.string().email().optional(),
    APP_TIMEZONE: z.string().default("Asia/Karachi"),
    PUBLIC_BASE_URL: z.string().url().optional(),
    STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
    UPLOAD_DIR: z.string().default("uploads"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    // Optional. Blank = private bucket: images are served through GET /api/files/<key>.
    R2_PUBLIC_URL: z.string().url().optional(),
    // Optional S3-compatible endpoint override (e.g. a local MinIO). Defaults to the account's R2 endpoint.
    R2_ENDPOINT: z.string().url().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.STORAGE_DRIVER !== "r2") return;
    for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const) {
      if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: `${k} is required when STORAGE_DRIVER=r2` });
    }
  });

// Browsers send Origin without a trailing slash; tolerate "https://app.vercel.app/" in CORS_ORIGINS.
export const normalizeOrigin = (s: string) => s.trim().replace(/\/+$/, "").toLowerCase();

// `KEY=` lines left blank in .env arrive as "" - treat them as unset.
const rawEnv = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ""));
const parsed = schema.safeParse(rawEnv);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${lines}`);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map(normalizeOrigin).filter(Boolean),
  isProd: parsed.data.NODE_ENV === "production",
};
