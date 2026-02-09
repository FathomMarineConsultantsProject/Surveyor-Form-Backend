import { query } from "../config/db.js";

export type SurveyorFormInsert = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  mobileNumber?: string | null;
  nationality: string;
  employmentStatus: string;
  companyName?: string | null;

  email: string;
  dobDD: string;
  dobMM: string;
  dobYYYY: string;
  yearStarted?: string | null;
  heardAbout: string;

  street1: string;
  street2?: string | null;
  city: string;
  postalCode: string;
  country: string;
  stateRegion: string;

  discipline: string;
  rank: string;

  qualifications: string[];
  experienceByQualification: Record<string, { years: string; months: string; days: string }>;

  vesselTypes: string[];
  shoresideExperience: string[];
  surveyingExperience: string[];
  vesselTypeSurveyingExperience: string[];
  accreditations: string[];
  coursesCompleted: string[];

  disciplineOther?: string | null;
  rankOther?: string | null;

  qualificationsOther?: string | null;

  vesselTypesOther?: string | null;
  shoresideExperienceOther?: string | null;

  surveyingExperienceOther?: string | null;
  vesselTypeSurveyingExperienceOther?: string | null;

  accreditationsOther?: string | null;
  coursesCompletedOther?: string | null;

  references: { name: string; contact: string }[];

  inspectionCost: string;
  marketingConsent: boolean;

  // ✅ Legacy (local uploads) - optional now
  photoPath?: string | null;
  cvPath?: string | null;

  // ✅ New (S3) - optional
  photoS3Key?: string | null;
  cvS3Key?: string | null;
};

function normalizePhone(v?: string | null) {
  if (!v) return null;
  return v.trim().replace(/[^\d+]/g, "");
}

export async function createForm(payload: SurveyorFormInsert) {
  const rows = await query<{ id: number }>(
    `INSERT INTO surveyor_forms (
      first_name, last_name, phone_number, mobile_number, nationality, employment_status, company_name,
      email, dob_dd, dob_mm, dob_yyyy, year_started, heard_about,
      street1, street2, city, postal_code, country, state_region,
      discipline, rank,

      discipline_other, rank_other,
      qualifications_other,
      vessel_types_other, shoreside_experience_other,
      surveying_experience_other, vessel_type_surveying_experience_other,
      accreditations_other, courses_completed_other,

      qualifications, experience_by_qualification,
      vessel_types, shoreside_experience, surveying_experience, vessel_type_surveying_experience,
      accreditations, courses_completed,
      refs,
      inspection_cost, marketing_consent,

      -- ✅ both legacy + s3 columns
      photo_path, cv_path,
      photo_s3_key, cv_s3_key
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,$13,
      $14,$15,$16,$17,$18,$19,
      $20,$21,

      $22,$23,
      $24,
      $25,$26,
      $27,$28,
      $29,$30,

      $31::jsonb,$32::jsonb,
      $33::jsonb,$34::jsonb,$35::jsonb,$36::jsonb,
      $37::jsonb,$38::jsonb,
      $39::jsonb,
      $40,$41,

      -- ✅ legacy
      $42,$43,

      -- ✅ s3
      $44,$45
    )
    RETURNING id`,
    [
      payload.firstName,
      payload.lastName,
      normalizePhone(payload.phoneNumber),
      normalizePhone(payload.mobileNumber ?? null),
      payload.nationality,
      payload.employmentStatus,
      payload.companyName ?? null,

      payload.email,
      payload.dobDD,
      payload.dobMM,
      payload.dobYYYY,
      payload.yearStarted ?? null,
      payload.heardAbout,

      payload.street1,
      payload.street2 ?? null,
      payload.city,
      payload.postalCode,
      payload.country,
      payload.stateRegion,

      payload.discipline,
      payload.rank,

      (payload.disciplineOther ?? "").trim() || null,
      (payload.rankOther ?? "").trim() || null,

      (payload.qualificationsOther ?? "").trim() || null,

      (payload.vesselTypesOther ?? "").trim() || null,
      (payload.shoresideExperienceOther ?? "").trim() || null,

      (payload.surveyingExperienceOther ?? "").trim() || null,
      (payload.vesselTypeSurveyingExperienceOther ?? "").trim() || null,

      (payload.accreditationsOther ?? "").trim() || null,
      (payload.coursesCompletedOther ?? "").trim() || null,

      JSON.stringify(payload.qualifications ?? []),
      JSON.stringify(payload.experienceByQualification ?? {}),

      JSON.stringify(payload.vesselTypes ?? []),
      JSON.stringify(payload.shoresideExperience ?? []),
      JSON.stringify(payload.surveyingExperience ?? []),
      JSON.stringify(payload.vesselTypeSurveyingExperience ?? []),

      JSON.stringify(payload.accreditations ?? []),
      JSON.stringify(payload.coursesCompleted ?? []),

      JSON.stringify(payload.references ?? []),

      payload.inspectionCost,
      payload.marketingConsent,

      // ✅ legacy paths (nullable)
      payload.photoPath ?? null,
      payload.cvPath ?? null,

      // ✅ s3 keys (nullable)
      payload.photoS3Key ?? null,
      payload.cvS3Key ?? null,
    ]
  );

  return rows[0];
}

export async function listForms(limit = 25, offset = 0) {
  return query(
    `SELECT
      id,
      first_name,
      last_name,
      phone_number,
      mobile_number,
      nationality,
      employment_status,
      company_name,

      email,
      dob_dd,
      dob_mm,
      dob_yyyy,
      year_started,
      heard_about,

      street1,
      street2,
      city,
      postal_code,
      country,
      state_region,

      discipline,
      rank,

      discipline_other,
      rank_other,
      qualifications_other,
      vessel_types_other,
      shoreside_experience_other,
      surveying_experience_other,
      vessel_type_surveying_experience_other,
      accreditations_other,
      courses_completed_other,

      qualifications,
      experience_by_qualification,

      vessel_types,
      shoreside_experience,
      surveying_experience,
      vessel_type_surveying_experience,

      accreditations,
      courses_completed,

      refs,

      inspection_cost,
      marketing_consent,

      photo_path,
      cv_path,

      -- ✅ return s3 keys too
      photo_s3_key,
      cv_s3_key,

      reviewed, reviewed_at,
      approved, approved_at,
      created_at
     FROM surveyor_forms
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function getStats() {
  const rows = await query(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE COALESCE(reviewed,false) = false)::int AS pending,
      COUNT(*) FILTER (WHERE COALESCE(approved,false) = true)::int AS approved,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS new_today
     FROM surveyor_forms`
  );
  return rows[0];
}

export async function markReviewed(id: number) {
  const rows = await query(
    `UPDATE surveyor_forms
     SET reviewed = true,
         reviewed_at = NOW()
     WHERE id = $1
     RETURNING id, reviewed, reviewed_at`,
    [id]
  );
  return rows[0];
}

export async function approveForm(id: number) {
  const rows = await query(
    `UPDATE surveyor_forms
     SET approved = true,
         approved_at = NOW()
     WHERE id = $1
       AND reviewed = true
       AND approved = false
     RETURNING id, approved, approved_at`,
    [id]
  );
  return rows[0];
}

/** ✅ Used by delete controller */
export async function getFormKeysById(id: number) {
  const rows = await query<{
    id: number;
    photo_s3_key: string | null;
    cv_s3_key: string | null;
    photo_path: string | null;
    cv_path: string | null;
  }>(
    `SELECT id, photo_s3_key, cv_s3_key, photo_path, cv_path
     FROM surveyor_forms
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/** ✅ Used by delete controller */
export async function deleteFormRowById(id: number) {
  const rows = await query<{ id: number }>(
    `DELETE FROM surveyor_forms
     WHERE id = $1
     RETURNING id`,
    [id]
  );
  return rows[0] ?? null;
}
