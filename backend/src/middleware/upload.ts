import multer from "multer";
import { badRequest } from "../lib/http";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 20, fieldSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(badRequest("Only JPEG, PNG, GIF or WebP images are allowed")),
});

export const uploadImages = upload.array("images", 10);
export const uploadAvatar = upload.single("Avatar");
