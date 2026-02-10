import express from "express";
import crypto from "crypto";
import { presignPut, s3, getBucket } from "../utils/s3.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();

/**
 * Optional: direct upload presign
 */
router.post("/files/presign", async (req, res) => {
  const { kind, contentType } = req.body;

  if (!kind || !contentType) {
    return res.status(400).json({ message: "kind and contentType required" });
  }

  const isPhoto = kind === "photo";
  const isCv = kind === "cv";

  if (isPhoto && !contentType.startsWith("image/")) {
    return res.status(400).json({ message: "Photo must be image/*" });
  }

  if (isCv && contentType !== "application/pdf") {
    return res.status(400).json({ message: "CV must be PDF" });
  }

  const id = crypto.randomUUID();
  const key = isPhoto ? `photos/${id}.img` : `cvs/${id}.pdf`;

  const uploadUrl = await presignPut(key, contentType, 300);
  res.json({ key, uploadUrl });
});

/**
 * ✅ OPTION B — NO EXPIRY
 * GET /api/files/stream?key=...
 */
router.get("/files/stream", requireAdmin, async (req, res) => {
  const key = String(req.query.key || "");
  if (!key) return res.status(400).json({ message: "key required" });

  try {
    const Bucket = getBucket();

    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    const contentType = head.ContentType || "application/octet-stream";

    const obj = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    if (!obj.Body) return res.status(404).json({ message: "Not found" });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");

    (obj.Body as any).pipe(res);
  } catch (err) {
    console.error("S3 stream error:", err);
    res.status(404).json({ message: "File not found" });
  }
});

export default router;
