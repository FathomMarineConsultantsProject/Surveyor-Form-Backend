import express from "express";
import crypto from "crypto";
import { presignPut, s3, getBucket } from "../utils/s3.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();

/**
 * POST /api/files/presign
 * body: { kind: "photo" | "cv", contentType: string }
 * returns: { key, uploadUrl }
 *
 * ✅ still useful if you upload directly from frontend to S3
 */
router.post("/files/presign", async (req, res) => {
  const { kind, contentType } = req.body as { kind: "photo" | "cv"; contentType: string };

  if (!kind || !contentType) return res.status(400).json({ message: "kind and contentType required" });

  const isPhoto = kind === "photo";
  const isCv = kind === "cv";

  if (isPhoto && !contentType.startsWith("image/")) {
    return res.status(400).json({ message: "Photo must be an image/*" });
  }

  // You allowed only PDF earlier. If you want DOC/DOCX too, update this check.
  if (isCv && contentType !== "application/pdf") {
    return res.status(400).json({ message: "CV must be application/pdf" });
  }

  const id = crypto.randomUUID();
  const ext = isPhoto ? "img" : "pdf";
  const key = isPhoto ? `photos/${id}.${ext}` : `cvs/${id}.${ext}`;

  const uploadUrl = await presignPut(key, contentType, 300);
  return res.json({ key, uploadUrl });
});

/**
 * ✅ NEW (Option B):
 * GET /api/files/stream?key=...
 * Requires admin cookie auth
 * Streams file directly from S3 (NO expiry problems)
 */
router.get("/files/stream", requireAdmin, async (req, res) => {
  const key = String(req.query.key || "");
  if (!key) return res.status(400).json({ success: false, message: "key required" });

  const Bucket = getBucket();

  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    const contentType = head.ContentType || "application/octet-stream";

    const obj = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    if (!obj.Body) return res.status(404).json({ success: false, message: "File not found" });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");

    (obj.Body as any).pipe(res);
  } catch (err) {
    console.error("S3 stream error:", err);
    return res.status(404).json({ success: false, message: "File not found" });
  }
});

export default router;
