import fs from "fs/promises";
import path from "path";
import Candidate from "../models/Candidate.js";
import Job from "../models/Job.js";
import { uploadDir } from "../middleware/upload.js";
import { uploadResumeFile, deleteResumeFile } from "../config/supabase.js";
import { generateCandidateInsights, parseResumeWithAI } from "../services/aiService.js";
import { matchCandidateToJob } from "../services/matchingService.js";
import { extractTextFromResume } from "../services/textExtractionService.js";
import { validateFileSignature } from "../utils/fileValidation.js";
import { sendEmail } from "../services/emailService.js";

export async function uploadCandidateResumes(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Resume files are required" });
    }

    const jobQuery = req.user.role === "Admin" ? {} : { createdBy: req.user._id };
    const jobs = await Job.find(jobQuery, "_id title requiredSkills minExperienceYears preferredEducation description");

    const candidateDocsToInsert = [];
    const existingCandidates = [];

    for (const file of req.files) {
      try {
        const isValid = await validateFileSignature(file.path);
        if (!isValid) {
          await fs.unlink(file.path).catch(() => {});
          console.warn(`Skipping invalid file signature: ${file.originalname}`);
          continue;
        }

        const resumeText = await extractTextFromResume(file);
        const parsed = await parseResumeWithAI(resumeText);

        const query = { uploadedBy: req.user._id };
        if (parsed.email && parsed.email.trim()) {
          query.email = parsed.email.toLowerCase().trim();
        } else {
          query.name = parsed.name;
          query["resumeFile.originalName"] = file.originalname;
        }

        const existing = await Candidate.findOne(query);
        if (existing) {
          existingCandidates.push(existing);
          continue;
        }

        const resumeFile = await uploadResumeFile(file);

        const candidateData = {
          ...parsed,
          resumeText,
          resumeFile,
          uploadedBy: req.user._id
        };

        candidateData.analysis = await generateCandidateInsights(candidateData);
        candidateData.matches = jobs
          .map((job) => matchCandidateToJob(candidateData, job))
          .sort((a, b) => b.score - a.score);

        candidateDocsToInsert.push(candidateData);
      } catch (err) {
        console.error("Error processing file", file.originalname, err);
      }
    }

    let insertedCandidates = [];
    if (candidateDocsToInsert.length > 0) {
      insertedCandidates = await Candidate.insertMany(candidateDocsToInsert);
    }

    res.status(201).json({ candidates: [...existingCandidates, ...insertedCandidates] });
  } catch (error) {
    next(error);
  }
}

export async function listCandidates(req, res, next) {
  try {
    const { skill, minExperience, minScore, sort = "-createdAt", page = 1, limit = 12, recruiterId } = req.query;
    let query = {};

    if (req.user.role === "Admin") {
      if (recruiterId) query.uploadedBy = recruiterId;
    } else {
      query.uploadedBy = req.user._id;
    }

    if (skill) {
      const escapedQuery = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedQuery, "i");
      query.$or = [{ name: regex }, { skills: regex }, { email: regex }];
    }
    if (minExperience) query.experienceYears = { $gte: Number(minExperience) };
    if (minScore) query["matches.score"] = { $gte: Number(minScore) };

    const skip = (Number(page) - 1) * Number(limit);
    const [candidates, total] = await Promise.all([
      Candidate.find(query).populate("uploadedBy", "name email").sort(sort).skip(skip).limit(Number(limit)),
      Candidate.countDocuments(query)
    ]);

    res.json({ candidates, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
}

export async function getCandidate(req, res, next) {
  try {
    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const candidate = await Candidate.findOne(query).populate("matches.job").populate("uploadedBy", "name email");
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    res.json({ candidate });
  } catch (error) {
    next(error);
  }
}

export async function shortlistCandidate(req, res, next) {
  try {
    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const isShortlisting = req.body.shortlisted ?? true;
    const candidate = await Candidate.findOneAndUpdate(
      query,
      { shortlisted: isShortlisting },
      { new: true }
    ).populate("matches.job");

    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    if (isShortlisting && candidate.email) {
      try {
        await sendEmail({
          to: candidate.email,
          subject: "Application Update - Candidate Shortlisted",
          text: `Hi ${candidate.name},\n\nWe are pleased to inform you that your resume has been shortlisted! Our HR recruitment team will be in touch with you regarding next steps.\n\nBest regards,\nHR Recruiting Team`
        });
      } catch (mailErr) {
        console.warn("Could not send shortlist email notification:", mailErr.message);
      }
    }

    res.json({ candidate });
  } catch (error) {
    next(error);
  }
}

export async function rematchCandidate(req, res, next) {
  try {
    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const candidate = await Candidate.findOne(query);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const jobQuery = req.user.role === "Admin" ? {} : { createdBy: req.user._id };
    const jobs = await Job.find(jobQuery);

    candidate.analysis = await generateCandidateInsights(candidate);
    candidate.matches = jobs
      .map((job) => matchCandidateToJob(candidate, job))
      .sort((a, b) => b.score - a.score);

    await candidate.save();
    res.json({ candidate });
  } catch (error) {
    next(error);
  }
}

export async function exportCandidateReport(req, res, next) {
  try {
    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const candidate = await Candidate.findOne(query);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const topMatch = candidate.matches?.[0];
    const report = [
      `=== Smart HR Candidate Summary Report ===`,
      `Candidate Name: ${candidate.name}`,
      `Contact Email: ${candidate.email || "N/A"}`,
      `Phone: ${candidate.phone || "N/A"}`,
      `Experience: ${candidate.experienceYears || 0} years`,
      `Core Skills: ${(candidate.skills || []).join(", ") || "None listed"}`,
      `Executive Summary: ${candidate.analysis?.summary || "N/A"}`,
      `Primary Job Match: ${topMatch ? `${topMatch.jobTitle} (${topMatch.score}%)` : "No job matches evaluated"}`,
      `Match Evaluation: ${topMatch?.reasoning || "N/A"}`,
      `Recommended Roles: ${(topMatch?.recommendedRoles || candidate.analysis?.bestFitRoles || []).join(", ")}`,
      `Suggested Interview Questions:\n${(candidate.analysis?.interviewQuestions || []).map((q, i) => `  ${i + 1}. ${q}`).join("\n")}`
    ].join("\n\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${candidate.name.replace(/\s+/g, "_")}_report.txt"`);
    res.send(report);
  } catch (error) {
    next(error);
  }
}

export async function deleteCandidate(req, res, next) {
  try {
    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const candidate = await Candidate.findOneAndDelete(query);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // Clean up physical file on disk and Supabase Storage
    if (candidate.resumeFile?.path) {
      await deleteResumeFile(candidate.resumeFile.path);
      const localPath = path.resolve(process.cwd(), candidate.resumeFile.path);
      await fs.unlink(localPath).catch(() => {});
      const uploadDirPath = path.join(uploadDir, path.basename(candidate.resumeFile.path));
      await fs.unlink(uploadDirPath).catch(() => {});
    }

    res.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function addNote(req, res, next) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Note text is required" });

    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const candidate = await Candidate.findOneAndUpdate(
      query,
      { $push: { notes: { text: text.trim(), createdBy: req.user._id } } },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    res.json({ notes: candidate.notes });
  } catch (error) {
    next(error);
  }
}

export async function deleteNote(req, res, next) {
  try {
    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const candidate = await Candidate.findOneAndUpdate(
      query,
      { $pull: { notes: { _id: req.params.noteId } } },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    res.json({ notes: candidate.notes });
  } catch (error) {
    next(error);
  }
}

export async function updateStage(req, res, next) {
  try {
    const { stage } = req.body;
    const validStages = ["new", "reviewing", "shortlisted", "interview", "hired", "rejected"];
    if (!validStages.includes(stage)) return res.status(400).json({ message: "Invalid stage" });

    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, uploadedBy: req.user._id };
    const candidate = await Candidate.findOneAndUpdate(query, { stage }, { new: true });
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    res.json({ candidate });
  } catch (error) {
    next(error);
  }
}
