import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// ✅ Must exist in local + vercel
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is missing");
}

// ✅ AWS RDS requires SSL from Vercel
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ✅ Log successful connection
pool.on("connect", () => {  
  console.log("✅ Connected to AWS RDS PostgreSQL Successfully");
});

// ✅ Log DB connection errors
pool.on("error", (err) => {
  console.error("❌ PostgreSQL Error:", err.message);
});

export async function query<T = any>(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
