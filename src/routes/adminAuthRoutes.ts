import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password, remember } = req.body as {
      username?: string;
      password?: string;
      remember?: boolean;
    };

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "username and password required" });
    }

    const JWT_SECRET = process.env.JWT_SECRET!;
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!;

    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { role: "admin", username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ HTTP-only cookie (Option B)
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : undefined, // session cookie if not remember
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("ADMIN LOGIN ERROR:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ✅ Used by ProtectedRoute
router.get("/me", requireAdmin, (req, res) => {
  return res.json({ success: true, user: (req as any).user });
});

export default router;
