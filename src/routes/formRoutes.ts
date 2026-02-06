import express from "express";
import multer from "multer";
import path from "path";

import {
  submitForm,
  getForms,
  markFormReviewed,
  approveForm,
} from "../controllers/formController.js";

const router = express.Router();

/* ===============================
   MULTER CONFIG
================================ */

const uploadDir = process.env.UPLOAD_DIR || "uploads";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + "-" + Date.now() + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

/* ===============================
   ROUTES
================================ */

// ✅ Submit surveyor form (multipart)
router.post(
  "/submit",
  upload.fields([
    { name: "photoFile", maxCount: 1 },
    { name: "cvFile", maxCount: 1 },
  ]),
  submitForm
);

// ✅ Admin: list form records
router.get("/records", getForms);

// ✅ Admin: mark reviewed
router.patch("/review/:id", markFormReviewed);

// ✅ Admin: approve form
router.patch("/approve/:id", approveForm);

export default router;
