import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

let supabaseInstance = null;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return supabaseInstance;
}

/**
 * Uploads a resume file buffer to Supabase Storage bucket 'resumes'.
 * Returns public URL and metadata. Falls back to local disk if Supabase is unavailable.
 */
export async function uploadResumeFile(file) {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      originalName: file.originalname,
      path: `uploads/${file.filename}`,
      mimeType: file.mimetype,
      url: `/uploads/${file.filename}`
    };
  }

  try {
    const fileBuffer = await fs.readFile(file.path);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.warn("Supabase Storage upload warning:", uploadError.message);
      return {
        originalName: file.originalname,
        path: `uploads/${file.filename}`,
        mimeType: file.mimetype,
        url: `/uploads/${file.filename}`
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from("resumes")
      .getPublicUrl(storagePath);

    return {
      originalName: file.originalname,
      path: storagePath,
      mimeType: file.mimetype,
      url: publicUrlData?.publicUrl || `/uploads/${file.filename}`
    };
  } catch (error) {
    console.error("Failed to upload to Supabase Storage:", error.message);
    return {
      originalName: file.originalname,
      path: `uploads/${file.filename}`,
      mimeType: file.mimetype,
      url: `/uploads/${file.filename}`
    };
  }
}

/**
 * Deletes a resume file from Supabase Storage 'resumes' bucket.
 */
export async function deleteResumeFile(filePath) {
  const supabase = getSupabase();
  if (!supabase || !filePath) return;

  try {
    const filename = path.basename(filePath);
    await supabase.storage.from("resumes").remove([filename, filePath]);
  } catch (err) {
    console.warn("Could not delete file from Supabase Storage:", err.message);
  }
}
