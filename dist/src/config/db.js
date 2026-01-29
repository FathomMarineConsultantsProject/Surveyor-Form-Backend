import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in .env");
}
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
// ✅ LOG when DB is connected
pool.on("connect", () => {
    console.log("✅ PostgreSQL database connected successfully");
});
// ✅ LOG database errors (very important)
pool.on("error", (err) => {
    console.error("❌ PostgreSQL connection error:", err);
});
export async function query(text, params) {
    const res = await pool.query(text, params);
    return res.rows;
}
