import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "express-async-errors";
import cookieParser from "cookie-parser";

import adminAuthRoutes from "./src/routes/adminAuthRoutes.js";
import formRoutes from "./src/routes/formRoutes.js";
import fileRoutes from "./src/routes/fileRoutes.js";
import { pool } from "./src/config/db.js";

dotenv.config();

const app = express();

// ✅ REQUIRED on Vercel/Proxies so secure cookies work
app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "https://surveyor-admin-page.vercel.app",
  "https://surveyor-admin-page-git-main-fmc-projects-projects.vercel.app",
  "https://surveyor-register-page.vercel.app",
  "https://surveyor-register-page-k4cy.vercel.app",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    // ✅ allow listed origins
    if (allowedOrigins.includes(origin)) return cb(null, true);

    // ✅ allow any vercel preview url
    if (origin.endsWith(".vercel.app")) return cb(null, true);

    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // ✅ REQUIRED for cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(cookieParser()); // ✅ REQUIRED

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/db-check", async (_req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    res.json({
      status: "success",
      message: "Connected to Postgres!",
      time: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "Failed to connect to DB",
      error: error.message,
    });
  }
});

// Routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/form", formRoutes);
app.use("/api", fileRoutes);

// Root
app.get("/", (_req, res) => res.json({ ok: true, message: "Backend running ✅" }));

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("🔥 API Error:", err);
  res.status(err?.status || 500).json({
    success: false,
    message: err?.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });
});

export default app;
