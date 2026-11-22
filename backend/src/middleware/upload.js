import fs from "fs";
import multer from "multer";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const defaultUploadDir = fileURLToPath(new URL("../uploads", import.meta.url));

export let uploadDir = defaultUploadDir;

if (isServerless) {
  uploadDir = path.join(os.tmpdir(), "smart-hr-uploads");
}

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (_err) {
  uploadDir = path.join(os.tmpdir(), "smart-hr-uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const allowed = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export const uploadResume = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.has(file.mimetype) || [".pdf", ".docx"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX resume formats are supported"));
    }
  }
});

