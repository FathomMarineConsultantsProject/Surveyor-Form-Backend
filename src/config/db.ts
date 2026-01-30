import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing");

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // ✅ Vercel + RDS fix
});

export async function query<T = any>(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
