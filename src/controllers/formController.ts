import type { Request, Response } from "express"
import { z } from "zod"
import * as Model from "../models/SurveyorFormModel.js"
import { s3Delete } from "../utils/s3.js"

// Helpers (arrays/objects may arrive as JSON strings)
function parseJsonField<T>(value: any, fallback: T): T {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value !== "string") return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const nameRegex = /^[A-Za-z\s]+$/

// ✅ Option A: S3 presigned upload -> backend receives JSON body with S3 keys
const formSchema = z.object({
  firstName: z
    .string()
    .min(1)
    .refine((v) => nameRegex.test(v.trim()), "First name must contain letters only"),
  lastName: z
    .string()
    .min(1)
    .refine((v) => nameRegex.test(v.trim()), "Last name must contain letters only"),

  phoneNumber: z.string().min(1),
  mobileNumber: z.string().optional(),

  nationality: z.string().min(1),
  employmentStatus: z.string().min(1),
  companyName: z.string().optional(),

  email: z.string().email(),
  dobDD: z.string().min(1),
  dobMM: z.string().min(1),
  dobYYYY: z.string().min(1),

  yearStarted: z.string().optional(),
  heardAbout: z.string().min(1),

  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  stateRegion: z.string().min(1),

  discipline: z.string().min(1),
  rank: z.string().min(1),

  inspectionCost: z.string().min(1),

  marketingConsent: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .default(false),

  // Other text fields
  disciplineOther: z.string().optional(),
  rankOther: z.string().optional(),
  qualificationsOther: z.string().optional(),
  vesselTypesOther: z.string().optional(),
  shoresideExperienceOther: z.string().optional(),
  surveyingExperienceOther: z.string().optional(),
  vesselTypeSurveyingExperienceOther: z.string().optional(),
  accreditationsOther: z.string().optional(),
  coursesCompletedOther: z.string().optional(),

  // ✅ REQUIRED in Option A (keys returned from /api/files/presign)
  photoS3Key: z.string().min(1, "photoS3Key is required"),
  cvS3Key: z.string().min(1, "cvS3Key is required"),
})

export async function submitForm(req: Request, res: Response) {
  // ✅ validate JSON body
  const base = formSchema.parse(req.body)

  // arrays/objects
  const qualifications = parseJsonField<string[]>(req.body.qualifications, [])
  const experienceByQualification = parseJsonField<Record<string, any>>(req.body.experienceByQualification, {})
  const vesselTypes = parseJsonField<string[]>(req.body.vesselTypes, [])
  const shoresideExperience = parseJsonField<string[]>(req.body.shoresideExperience, [])
  const surveyingExperience = parseJsonField<string[]>(req.body.surveyingExperience, [])
  const vesselTypeSurveyingExperience = parseJsonField<string[]>(req.body.vesselTypeSurveyingExperience, [])
  const accreditations = parseJsonField<string[]>(req.body.accreditations, [])
  const coursesCompleted = parseJsonField<string[]>(req.body.coursesCompleted, [])
  const references = parseJsonField<{ name: string; contact: string }[]>(req.body.references, [])

  // Clean other text fields
  const otherFields = {
    disciplineOther: (base.disciplineOther ?? "").trim(),
    rankOther: (base.rankOther ?? "").trim(),
    qualificationsOther: (base.qualificationsOther ?? "").trim(),
    vesselTypesOther: (base.vesselTypesOther ?? "").trim(),
    shoresideExperienceOther: (base.shoresideExperienceOther ?? "").trim(),
    surveyingExperienceOther: (base.surveyingExperienceOther ?? "").trim(),
    vesselTypeSurveyingExperienceOther: (base.vesselTypeSurveyingExperienceOther ?? "").trim(),
    accreditationsOther: (base.accreditationsOther ?? "").trim(),
    coursesCompletedOther: (base.coursesCompletedOther ?? "").trim(),
  }

  // Keep DB clean: clear "other text" unless Other selected
  if (String(base.discipline).toLowerCase() !== "other") otherFields.disciplineOther = ""
  if (String(base.rank).toLowerCase() !== "other") otherFields.rankOther = ""

  if (!qualifications.includes("Other")) otherFields.qualificationsOther = ""
  if (!vesselTypes.includes("Other")) otherFields.vesselTypesOther = ""
  if (!shoresideExperience.includes("Other")) otherFields.shoresideExperienceOther = ""
  if (!surveyingExperience.includes("Other")) otherFields.surveyingExperienceOther = ""
  if (!vesselTypeSurveyingExperience.includes("Other")) otherFields.vesselTypeSurveyingExperienceOther = ""
  if (!accreditations.includes("Other")) otherFields.accreditationsOther = ""
  if (!coursesCompleted.includes("Other")) otherFields.coursesCompletedOther = ""

  // ✅ Option A: store S3 keys as photoPath/cvPath (your DB expects photo_path/cv_path NOT NULL)
  // Store the KEY (e.g. "photos/uuid.png") OR full https URL — pick ONE format and keep consistent.
  const photoPath = base.photoS3Key.trim()
  const cvPath = base.cvS3Key.trim()

  const inserted = await Model.createForm({
    ...base,

    qualifications,
    experienceByQualification,
    vesselTypes,
    shoresideExperience,
    surveyingExperience,
    vesselTypeSurveyingExperience,
    accreditations,
    coursesCompleted,
    references,

    ...otherFields,

    // ✅ IMPORTANT: satisfy NOT NULL constraint
    photoPath,
    cvPath,
  })

  return res.status(201).json({
    success: true,
    message: "Form submitted",
    data: inserted,
  })
}

export async function getForms(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 25)
  const offset = Number(req.query.offset ?? 0)
  const rows = await Model.listForms(limit, offset)
  return res.json({ success: true, data: rows })
}

export async function getStats(req: Request, res: Response) {
  const stats = await Model.getStats()
  return res.json({ success: true, data: stats })
}

export async function markFormReviewed(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: "Invalid id" })

  const updated = await Model.markReviewed(id)
  if (!updated) return res.status(404).json({ success: false, message: "Form not found" })

  return res.json({ success: true, data: updated })
}

export async function approveForm(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: "Invalid id" })

  const updated = await Model.approveForm(id)
  if (!updated) {
    return res.status(400).json({
      success: false,
      message: "Cannot approve: form must be reviewed first (or already approved).",
    })
  }

  return res.json({ success: true, data: updated })
}

export async function deleteFormById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" })

    // Must exist in your model: returns { photo_path, cv_path } (either s3 key or full url)
    const row = await Model.getFormKeysById(id)
    if (!row) return res.status(404).json({ success: false, message: "Form not found" })

    // If you stored KEY in photo_path/cv_path, delete those keys:
    // If you stored full URL, you must extract the key before deleting.
    const photoKey = row.photo_path
    const cvKey = row.cv_path

    await Promise.all([
      photoKey ? s3Delete(photoKey) : Promise.resolve(),
      cvKey ? s3Delete(cvKey) : Promise.resolve(),
    ])

    const deleted = await Model.deleteFormRowById(id)
    if (!deleted) return res.status(404).json({ success: false, message: "Form not found" })

    return res.json({ success: true, message: "Deleted", id: deleted.id })
  } catch (err) {
    console.error("deleteFormById error:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}
