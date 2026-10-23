import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, normalizeOrigin } from "./config/env";
import { requestContext } from "./lib/context";
import { buildOpenApi } from "./lib/openapi";
import { localUploadRoot, storage } from "./lib/storage";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { controllers } from "./modules";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  // Uploaded images are loaded by the frontend from a different origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(normalizeOrigin(origin))),
      credentials: true,
    }),
  );
  if (!env.isProd || process.env.LOG_REQUESTS === "true") app.use(morgan(env.isProd ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));

  app.use((req, _res, next) => requestContext.run({ baseUrl: `${req.protocol}://${req.get("host")}` }, next));

  app.get("/", (_req, res) => res.json({ isSuccess: true, message: "VYRON API", data: null }));

  if (env.STORAGE_DRIVER === "local") {
    app.use("/uploads", express.static(localUploadRoot, { index: false, dotfiles: "deny", maxAge: "30d", immutable: true }));
  }

  const api = express.Router();
  if (env.STORAGE_DRIVER === "r2" && !env.R2_PUBLIC_URL) {
    // <img> tags cannot send an Authorization header, so this is public like a public bucket would be;
    // object keys are random UUIDs and only product/avatar images live under these prefixes.
    api.get(/^\/files\/((?:products|avatars)\/[0-9a-f-]{36}\.(?:jpg|png|gif|webp))$/, async (req, res, next) => {
      try {
        const file = await storage.read(req.params[0]);
        if (!file) return void res.status(404).json({ isSuccess: false, message: "File not found", error: "File not found" });
        res.setHeader("Content-Type", file.contentType);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        if (file.length !== undefined) res.setHeader("Content-Length", String(file.length));
        file.body.on("error", next).pipe(res);
      } catch (e) {
        next(e);
      }
    });
  }
  api.get("/health", (_req, res) => res.json({ isSuccess: true, message: "ok", data: null }));
  for (const [segment, router] of controllers) api.use(`/${segment}`, router);

  if (!env.isProd) {
    const spec = buildOpenApi();
    api.get("/docs.json", (_req, res) => res.json(spec));
  }
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Vercel (Express framework preset) auto-detects src/app.ts as the serverless entry (it is checked
// before src/server.ts) and requires the default export to literally be the Express app function —
// not the result of an inline factory call. Assign first, then export, to match Vercel's documented
// Express entrypoint contract exactly: https://vercel.com/docs/frameworks/backend/express
const app = createApp();
export default app;
