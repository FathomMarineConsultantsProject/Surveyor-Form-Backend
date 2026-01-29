import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" })

  try {
    const secret = process.env.JWT_SECRET!
    const decoded = jwt.verify(token, secret) as any

    if (decoded?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" })
    }

    ;(req as any).user = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" })
  }
}
