import app from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

// On Vercel the platform invokes the exported app per request; it must not bind a port.
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`PSO API listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

export default app;
