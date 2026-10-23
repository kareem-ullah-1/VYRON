import { AsyncLocalStorage } from "node:async_hooks";

/** Per-request values needed deep inside serializers (e.g. absolute image URLs). */
export const requestContext = new AsyncLocalStorage<{ baseUrl: string }>();
