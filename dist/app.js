import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import "express-async-errors";
import adminAuthRoutes from "./src/routes/adminAuthRoutes.js";
import formRoutes from "./src/routes/formRoutes.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
dotenv.config();
const app = express();
// ✅ Allow frontend origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "https://surveyor-admin-page-git-main-fmc-projects-projects.vercel.app",
    "https://surveyor-admin-page.vercel.app",
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow Postman / server-to-server
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.error("❌ Blocked by CORS:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
// ✅ Apply CORS once
app.use(cors(corsOptions));
// ✅ Preflight must use SAME config
app.options("*", cors(corsOptions));
// ✅ Body parser
app.use(express.json());
// ✅ Static uploads
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "uploads")));
// ✅ Health check
app.get("/health", (req, res) => res.json({ ok: true }));
// ✅ Routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/form", formRoutes);
// ✅ Error handler LAST
app.use(errorHandler);
export default app;
