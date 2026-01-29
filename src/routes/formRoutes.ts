import { Router } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { submitForm, getForms, markFormReviewed, getStats ,approveForm} from "../controllers/formController.js"
import { requireAdmin } from "../middleware/requireAdmin.js"

const router = Router()

// const uploadDir = process.env.UPLOAD_DIR || "uploads"

const uploadDir = process.env.VERCEL
  ? "/tmp/uploads"
  : process.env.UPLOAD_DIR
    ? path.isAbsolute(process.env.UPLOAD_DIR)
      ? process.env.UPLOAD_DIR
      : path.join(process.cwd(), process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "uploads")

// Ensure upload dir exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const safeBase = path.basename(file.originalname, ext).replace(/\s+/g, "_")
    cb(null, `${Date.now()}_${safeBase}${ext}`)
  },
})

function fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (file.fieldname === "photoFile" && !file.mimetype.startsWith("image/")) {
    return cb(new Error("Photo must be an image"))
  }

  if (file.fieldname === "cvFile") {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if (!ok) return cb(new Error("CV must be PDF/DOC/DOCX"))
  }

  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

// ✅ PUBLIC (surveyor form submit)
router.post(
  "/submit",
  upload.fields([
    { name: "photoFile", maxCount: 1 },
    { name: "cvFile", maxCount: 1 },
  ]),
  submitForm
)

// ✅ ADMIN ONLY
router.get("/records", requireAdmin, getForms)
router.get("/stats", requireAdmin, getStats)
router.patch("/:id/review", requireAdmin, markFormReviewed)

router.patch("/:id/approve", requireAdmin, approveForm)

router.get("/ping", (req, res) => res.json({ ok: true, route: "form" }))

export default router
