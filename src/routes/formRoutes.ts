import { Router } from "express"
import {
  submitForm,
  getForms,
  markFormReviewed,
  getStats,
  approveForm,
  deleteFormById,
} from "../controllers/formController.js"
import { requireAdmin } from "../middleware/requireAdmin.js"

const router = Router()

// ✅ PUBLIC (surveyor form submit)
// Option A: Files are uploaded to S3 via presigned URL on frontend,
// so /submit should NOT use multer and should accept JSON/body fields:
// photoPath + cvPath (S3 key/url)
router.post("/submit", submitForm)

// ✅ ADMIN ONLY
router.get("/records", requireAdmin, getForms)
router.get("/stats", requireAdmin, getStats)
router.patch("/:id/review", requireAdmin, markFormReviewed)
router.patch("/:id/approve", requireAdmin, approveForm)

// ✅ DELETE by id
router.delete("/:id", requireAdmin, deleteFormById)

router.get("/ping", (_req, res) => res.json({ ok: true, route: "form" }))

export default router
