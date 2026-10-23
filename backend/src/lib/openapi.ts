import { z } from "zod";
import { registry } from "./route";

const toSchema = (s: z.ZodType) => {
  const { $schema: _omit, ...rest } = z.toJSONSchema(s, { unrepresentable: "any", io: "input" }) as Record<string, unknown>;
  return rest;
};

const envelope = {
  type: "object",
  properties: {
    isSuccess: { type: "boolean" },
    message: { type: "string" },
    data: {},
  },
  required: ["isSuccess", "message"],
};

export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const { tag, def } of registry) {
    const oaPath = `/${tag}${def.path}`.replace(/:([A-Za-z]+)/g, "{$1}");
    const params = [...def.path.matchAll(/:([A-Za-z]+)/g)].map((m) => ({
      name: m[1],
      in: "path",
      required: true,
      schema: { type: "integer" },
    }));

    const operation: Record<string, unknown> = {
      tags: [tag],
      summary: def.summary,
      parameters: [...params],
      responses: {
        "200": { description: "Success envelope", content: { "application/json": { schema: envelope } } },
        "400": { description: "Validation error" },
        ...(def.access !== "public" && def.access !== "optional" ? { "401": { description: "Unauthenticated" } } : {}),
        ...(Array.isArray(def.access) ? { "403": { description: `Requires role: ${def.access.join(" | ")}` } } : {}),
      },
    };

    if (def.access !== "public") operation.security = [{ bearerAuth: [] }];
    if (Array.isArray(def.access)) operation.description = `Allowed roles: ${def.access.join(", ")}`;

    if (def.query) {
      const q = toSchema(def.query) as { properties?: Record<string, unknown> };
      (operation.parameters as unknown[]).push(
        ...Object.entries(q.properties ?? {}).map(([name, schema]) => ({ name, in: "query", required: false, schema })),
      );
    }

    if (def.multipart) {
      const props: Record<string, unknown> = def.multipart.jsonField
        ? { [def.multipart.jsonField]: { type: "string", description: "JSON payload", ...(def.body ? { example: "see schema" } : {}) } }
        : def.body
          ? ((toSchema(def.body) as { properties?: Record<string, unknown> }).properties ?? {})
          : {};
      props[def.multipart.files === "images" ? "images" : "Avatar"] =
        def.multipart.files === "images"
          ? { type: "array", items: { type: "string", format: "binary" } }
          : { type: "string", format: "binary" };
      operation.requestBody = { content: { "multipart/form-data": { schema: { type: "object", properties: props } } } };
    } else if (def.body) {
      operation.requestBody = { required: true, content: { "application/json": { schema: toSchema(def.body) } } };
    }

    (paths[oaPath] ??= {})[def.method] = operation;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "PSO POS API",
      version: "1.0.0",
      description:
        "Backend for the PSO POS frontend. Every response uses the envelope `{ isSuccess, message, data }`; errors add `error` (same text as `message`).",
    },
    servers: [{ url: "/api" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
    paths,
  };
}
