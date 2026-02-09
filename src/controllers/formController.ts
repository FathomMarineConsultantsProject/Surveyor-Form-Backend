import type { Request, Response } from "express";
import path from "path";
import { z } from "zod";
import * as Model from "../models/SurveyorFormModel.js";
import { s3Delete } from "../utils/s3.js";

// Helpers for multipart fields that arrive as strings
function parseJsonField<T>(value: any, fallback: T): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const nameRegex = /^[A-Za-z\s]+$/;

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

  // ✅ NEW: accept Other fields from multipart (optional)
  disciplineOther: z.string().optional(),
  rankOther: z.string().optional(),

  qualificationsOther: z.string().optional(),
  vesselTypesOther: z.string().optional(),
  shoresideExperienceOther: z.string().optional(),
  surveyingExperienceOther: z.string().optional(),
  vesselTypeSurveyingExperienceOther: z.string().optional(),
  accreditationsOther: z.string().optional(),
  coursesCompletedOther: z.string().optional(),

  // ✅ S3 keys (for Vercel presigned flow)
  photoS3Key: z.string().optional(),
  cvS3Key: z.string().optional(),
});

export async function submitForm(req: Request, res: Response) {
  // Validate base + other fields
  const base = formSchema.parse(req.body);

  // Parse JSON array/object fields from multipart
  const qualifications = parseJsonField<string[]>(req.body.qualifications, []);
  const experienceByQualification = parseJsonField<Record<string, any>>(req.body.experienceByQualification, {});
  const vesselTypes = parseJsonField<string[]>(req.body.vesselTypes, []);
  const shoresideExperience = parseJsonField<string[]>(req.body.shoresideExperience, []);
  const surveyingExperience = parseJsonField<string[]>(req.body.surveyingExperience, []);
  const vesselTypeSurveyingExperience = parseJsonField<string[]>(req.body.vesselTypeSurveyingExperience, []);
  const accreditations = parseJsonField<string[]>(req.body.accreditations, []);
  const coursesCompleted = parseJsonField<string[]>(req.body.coursesCompleted, []);
  const references = parseJsonField<{ name: string; contact: string }[]>(req.body.references, []);

  // Clean Other fields (avoid saving garbage whitespace)
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
  };

  // OPTIONAL: clear other text if not relevant
  if (base.discipline !== "other") otherFields.disciplineOther = "";
  if (base.rank !== "other") otherFields.rankOther = "";

  if (!qualifications.includes("Other")) otherFields.qualificationsOther = "";
  if (!vesselTypes.includes("Other")) otherFields.vesselTypesOther = "";
  if (!shoresideExperience.includes("Other")) otherFields.shoresideExperienceOther = "";
  if (!surveyingExperience.includes("Other")) otherFields.surveyingExperienceOther = "";
  if (!vesselTypeSurveyingExperience.includes("Other")) otherFields.vesselTypeSurveyingExperienceOther = "";
  if (!accreditations.includes("Other")) otherFields.accreditationsOther = "";
  if (!coursesCompleted.includes("Other")) otherFields.coursesCompletedOther = "";

  // ✅ 1) Prefer S3 keys (Vercel production flow)
  const photoS3Key = (base.photoS3Key ?? "").trim();
  const cvS3Key = (base.cvS3Key ?? "").trim();

  // ✅ 2) Optional legacy local uploads support (if req.files exists)
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const photo = files?.photoFile?.[0];
  const cv = files?.cvFile?.[0];

  // If NOT using S3 keys, require legacy files
  if (!photoS3Key || !cvS3Key) {
    // legacy path: require files
    if (!photo) return res.status(400).json({ success: false, message: "photoFile is required (or photoS3Key)" });
    if (!cv) return res.status(400).json({ success: false, message: "cvFile is required (or cvS3Key)" });
  }

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

    // ✅ New S3 fields
    photoS3Key: photoS3Key || null,
    cvS3Key: cvS3Key || null,

    // ✅ Legacy fields (only if using multer upload)
    photoPath: photo ? path.posix.join("uploads", photo.filename) : null,
    cvPath: cv ? path.posix.join("uploads", cv.filename) : null,
  });

  return res.status(201).json({
    success: true,
    message: "Form submitted",
    data: inserted,
  });
}

export async function getForms(req: Request, res: Response) {
  const limit = Number(req.query.limit ?? 25);
  const offset = Number(req.query.offset ?? 0);
  const rows = await Model.listForms(limit, offset);
  return res.json({ success: true, data: rows });
}

export async function getStats(req: Request, res: Response) {
  const stats = await Model.getStats();
  return res.json({ success: true, data: stats });
}

export async function markFormReviewed(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  const updated = await Model.markReviewed(id);

  if (!updated) {
    return res.status(404).json({ success: false, message: "Form not found" });
  }

  return res.json({ success: true, data: updated });
}

export async function deleteFormById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

    // 1) fetch keys first (S3 keys OR legacy paths)
    const row = await Model.getFormKeysById(id);
    if (!row) return res.status(404).json({ success: false, message: "Form not found" });

    // row should contain:
    // { photo_s3_key, cv_s3_key, photo_path, cv_path }
    // We'll delete S3 objects if keys exist.
    await Promise.all([
      row.photo_s3_key ? s3Delete(row.photo_s3_key) : Promise.resolve(),
      row.cv_s3_key ? s3Delete(row.cv_s3_key) : Promise.resolve(),
    ]);

    // 2) hard delete DB row
    const deleted = await Model.deleteFormRowById(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    return res.json({ success: true, message: "Deleted", id: deleted.id });
  } catch (err) {
    console.error("deleteFormById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function approveForm(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid id" });

  const updated = await Model.approveForm(id);

  if (!updated) {
    return res.status(400).json({
      success: false,
      message: "Cannot approve: form must be reviewed first (or already approved).",
    });
  }

  return res.json({ success: true, data: updated });
}
