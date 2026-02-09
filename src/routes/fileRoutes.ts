import express from "express";
import crypto from "crypto";
import { presignPut, presignGet } from "../utils/s3.js";

const router = express.Router();

/**
 * POST /api/files/presign
 * body: { kind: "photo" | "cv", contentType: string }
 * returns: { key, uploadUrl }
 */
router.post("/files/presign", async (req, res) => {
  const { kind, contentType } = req.body as { kind: "photo" | "cv"; contentType: string };

  if (!kind || !contentType) return res.status(400).json({ message: "kind and contentType required" });

  const isPhoto = kind === "photo";
  const isCv = kind === "cv";

  if (isPhoto && !contentType.startsWith("image/")) {
    return res.status(400).json({ message: "Photo must be an image/*" });
  }
  if (isCv && contentType !== "application/pdf") {
    return res.status(400).json({ message: "CV must be application/pdf" });
  }

  const id = crypto.randomUUID();
  const ext = isPhoto ? "img" : "pdf"; // keep simple; mimetype controls preview anyway
  const key = isPhoto ? `photos/${id}.${ext}` : `cvs/${id}.${ext}`;

  const uploadUrl = await presignPut(key, contentType, 300);
  return res.json({ key, uploadUrl });
});

/**
 * GET /api/files/view?key=...
 * returns: { url }
 */
router.get("/files/view", async (req, res) => {
  const key = String(req.query.key || "");
  if (!key) return res.status(400).json({ message: "key required" });

  const url = await presignGet(key, 300);
  return res.json({ url });
});

export default router;
