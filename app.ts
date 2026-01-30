// import express from "express"
// import cors from "cors"
// import dotenv from "dotenv"
// import path from "path"
// import "express-async-errors"

// import adminAuthRoutes from "./src/routes/adminAuthRoutes.js"
// import formRoutes from "./src/routes/formRoutes.js"
// import { errorHandler } from "./src/middleware/errorHandler.js"

// dotenv.config()

// const app = express()

// // ✅ Allow frontend origins
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://127.0.0.1:5173",
//   "http://localhost:5174",
//   "https://surveyor-admin-page-git-main-fmc-projects-projects.vercel.app",
//   "https://surveyor-admin-page.vercel.app",
//   "https://surveyor-register-page-k4cy.vercel.app",A
// ]

// const corsOptions: cors.CorsOptions = {
//   origin: (origin, callback) => {
//     // Allow Postman / server-to-server
//     if (!origin) return callback(null, true)AA

//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true)
//     }

//     console.error("❌ Blocked by CORS:", origin)
//     return callback(new Error("Not allowed by CORS"))
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }

// // ✅ Apply CORS once
// app.use(cors(corsOptions))

// // ✅ Preflight must use SAME config
// app.options("*", cors(corsOptions))

// // ✅ Body parser
// app.use(express.json())

// // ✅ Static uploads
// app.use(
//   "/uploads",
//   express.static(path.resolve(process.env.UPLOAD_DIR || "uploads"))
// )

// // ✅ Health check
// app.get("/health", (req, res) => res.json({ ok: true }))

// // ✅ Routes
// app.use("/api/admin", adminAuthRoutes)
// app.use("/api/form", formRoutes)

// // ✅ Error handler LAST
// app.use(errorHandler)
// app.get("/", (req, res) => res.json({ ok: true, message: "Backend running ✅" }))


// export default app

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "express-async-errors";
import adminAuthRoutes from "./src/routes/adminAuthRoutes.js";
import formRoutes from "./src/routes/formRoutes.js";
// import { errorHandler } from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();

// 1. Explicit Allowed Origins (Production & Local)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "https://surveyor-admin-page.vercel.app",
  "https://surveyor-admin-page-git-main-fmc-projects-projects.vercel.app"
];

// 2. Dynamic CORS Configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);

    // Check against explicit list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ✅ FIX: Allow ALL Vercel preview URLs automatically
    // This allows any URL ending in .vercel.app (e.g. your -mmb6thaes- url)
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    console.error("❌ Blocked by CORS:", origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// 3. Apply CORS Middleware
app.use(cors(corsOptions));

// 4. Handle Preflight Requests Explicitly
// Passing 'corsOptions' ensures OPTIONS requests get the same logic as POST/GET
app.options("*", cors(corsOptions));

app.use(express.json());

// Health Check
app.get("/health", (req, res) => {
    res.json({ ok: true });
});

// Routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/form", formRoutes);

// Error Handler
// app.use(errorHandler);

// Root Endpoint
app.get("/", (req, res) => {
    res.json({ ok: true, message: "Backend running ✅" });
});

export default app;


