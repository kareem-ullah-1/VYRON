import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { env } from "../config/env";
import { requestContext } from "./context";
import { badRequest } from "./http";

type Kind = "products" | "avatars";

const SIGNATURES: { ext: string; mime: string; match: (b: Buffer) => boolean }[] = [
  { ext: "jpg", mime: "image/jpeg", match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "gif", mime: "image/gif", match: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  { ext: "webp", mime: "image/webp", match: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

const KEY_PATTERN = /^(products|avatars)\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/;

const localRoot = path.resolve(env.UPLOAD_DIR);
export const localUploadRoot = localRoot;

const s3 =
  env.STORAGE_DRIVER === "r2"
    ? new S3Client({
        region: "auto",
        endpoint: env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        forcePathStyle: Boolean(env.R2_ENDPOINT),
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
      })
    : null;

export const storage = {
  /** Validates the bytes really are a supported image (the client-sent mimetype is not trusted) and stores it. */
  async saveImage(file: { buffer: Buffer }, kind: Kind): Promise<string> {
    const sig = SIGNATURES.find((s) => s.match(file.buffer));
    if (!sig) throw badRequest("Only JPEG, PNG, GIF or WebP images are allowed");
    const key = `${kind}/${randomUUID()}.${sig.ext}`;

    if (s3) {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: sig.mime,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    } else {
      const target = path.join(localRoot, key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.buffer);
    }
    return key;
  },

  async remove(key: string | null | undefined): Promise<void> {
    if (!key || !KEY_PATTERN.test(key)) return;
    try {
      if (s3) await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
      else await fs.rm(path.join(localRoot, key), { force: true });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to delete stored file ${key}:`, (e as Error).message);
    }
  },

  url(key: string | null | undefined): string | null {
    if (!key) return null;
    if (env.STORAGE_DRIVER === "r2" && env.R2_PUBLIC_URL) return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
    const base = env.PUBLIC_BASE_URL ?? requestContext.getStore()?.baseUrl ?? `http://localhost:${env.PORT}`;
    // Private R2 bucket: the backend streams the object (see GET /api/files/*). Local disk: static /uploads.
    const prefix = env.STORAGE_DRIVER === "r2" ? "/api/files/" : "/uploads/";
    return `${base.replace(/\/$/, "")}${prefix}${key}`;
  },

  /** Streams a private R2 object. Returns null when the key is malformed or the object does not exist. */
  async read(key: string): Promise<{ body: Readable; contentType: string; length?: number } | null> {
    if (!s3 || !KEY_PATTERN.test(key)) return null;
    try {
      const out = await s3.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
      if (!out.Body) return null;
      return { body: out.Body as Readable, contentType: out.ContentType ?? "application/octet-stream", length: out.ContentLength };
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name === "NoSuchKey" || name === "NotFound") return null;
      throw e;
    }
  },
};
