export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (m: string, details?: unknown) => new HttpError(400, m, details);
export const unauthorized = (m = "Authentication required") => new HttpError(401, m);
export const forbidden = (m = "You do not have permission to perform this action") => new HttpError(403, m);
export const notFound = (m = "Not found") => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);

export interface Result {
  status: number;
  body: { isSuccess: true; message: string; data: unknown };
}

/** Success envelope. The frontend reads `isSuccess`, `message` and `data`. */
export const ok = (data: unknown = null, message = "Success", status = 200): Result => ({
  status,
  body: { isSuccess: true, message, data },
});

export function parseId(raw: string | undefined, label = "id"): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 2_147_483_647) throw badRequest(`Invalid ${label}`);
  return n;
}

/** Lower-cases the first letter of every top-level key: `{ Name: 1 }` -> `{ name: 1 }`. */
export function camelizeKeys(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), v]),
  );
}
