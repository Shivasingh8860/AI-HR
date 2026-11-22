import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import { isSupabaseConfigured } from "./config/supabase.js";
import { uploadDir } from "./middleware/upload.js";
import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const uploadsPath = fileURLToPath(new URL("./uploads", import.meta.url));

app.use(helmet({
  crossOriginResourcePolicy: false,
  frameguard: false
}));

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, "");
    if (
      allowedOrigins.includes(cleanOrigin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin) ||
      /\.vercel\.app$/.test(cleanOrigin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000 }));

// Database connection assurance for serverless environments
app.use(async (_req, res, next) => {
  if (isSupabaseConfigured()) {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failure:", error.message);
    res.status(503).json({
      message: "Database connection failed. Please ensure MONGO_URI or SUPABASE_URL is configured correctly in environment variables.",
      error: error.message
    });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "smart-hr-api" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "smart-hr-api" }));
app.use("/uploads", express.static(uploadsPath));
app.use("/uploads", express.static(uploadDir));
app.use("/src/uploads", express.static(uploadsPath));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((error, _req, res, _next) => {
  console.error("Server Error:", error.message || error);
  if (error.name === "ZodError") {
    const firstMessage = error.errors?.[0]?.message || "Invalid input data";
    return res.status(400).json({
      message: firstMessage,
      details: error.errors
    });
  }

  const status = error.status || (error.name === "ValidationError" ? 400 : 500);
  res.status(status).json({
    message: error.message || "Unexpected server error"
  });
});

if (process.env.NODE_ENV !== "test" && (!process.env.VERCEL || process.env.PORT)) {
  if (isSupabaseConfigured()) {
    app.listen(port, () => console.log(`Smart HR API running with Supabase backend on http://localhost:${port}`));
  } else {
    connectDB()
      .then(() => {
        app.listen(port, () => console.log(`Smart HR API running on http://localhost:${port}`));
      })
      .catch((error) => {
        console.error("Failed to connect to database:", error.message);
        app.listen(port, () => {
          console.warn(`Smart HR API listening on http://localhost:${port} (WARNING: Database is currently disconnected)`);
        });
      });
  }
}

export default app;
