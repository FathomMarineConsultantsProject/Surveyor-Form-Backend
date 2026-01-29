import { ZodError } from "zod";
export function errorHandler(err, req, res, next) {
    // Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.flatten(),
        });
    }
    const status = err?.statusCode || 500;
    const message = err?.message || "Server error";
    if (process.env.NODE_ENV !== "production") {
        console.error("ERROR:", err);
    }
    return res.status(status).json({ success: false, message });
}
