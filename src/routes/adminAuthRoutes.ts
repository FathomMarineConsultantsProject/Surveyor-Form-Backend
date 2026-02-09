import { Router } from "express"
import type { Request, Response } from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const router = Router()

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password, remember } = req.body as {
      username?: string
      password?: string
      remember?: boolean
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "username and password required" })
    }

    const JWT_SECRET = process.env.JWT_SECRET
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Server misconfigured: JWT_SECRET missing" })
    }
    if (!ADMIN_PASSWORD_HASH) {
      return res.status(500).json({ success: false, message: "Server misconfigured: ADMIN_PASSWORD_HASH missing" })
    }

    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ success: false, message: "Invalid credentials" })
    }

    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" })
    }

    const token = jwt.sign({ role: "admin", username }, JWT_SECRET, { expiresIn: "7d" })

    // ✅ cookie lifetime
    const maxAge = remember
      ? 7 * 24 * 60 * 60 * 1000 // 7 days
      : 2 * 60 * 60 * 1000 // 2 hours if not remember

    // ✅ set httpOnly cookie (works with <img> / <a>)
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: true,      // ✅ Vercel is HTTPS
      sameSite: "none",  // ✅ cross-site cookie (admin frontend separate domain)
      path: "/",
      maxAge,
    })

    return res.json({ success: true, data: { username } })
  } catch (err: any) {
    console.error("ADMIN LOGIN ERROR:", err)
    return res.status(500).json({ success: false, message: err?.message || "Internal Server Error" })
  }
})

// ✅ optional logout
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("admin_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  })
  return res.json({ success: true })
})

export default router
