import { z } from "zod";
import Candidate from "../models/Candidate.js";
import Job from "../models/Job.js";
import { matchCandidateToJob } from "../services/matchingService.js";

const jobSchema = z.object({
  title: z.string().min(2, "Job title is required"),
  department: z.string().min(2, "Department is required"),
  description: z.string().min(10, "Please provide a descriptive job summary"),
  requiredSkills: z.array(z.string()).default([]),
  preferredEducation: z.string().optional(),
  minExperienceYears: z.number().min(0).default(0)
});

export async function createJob(req, res, next) {
  try {
    const data = jobSchema.parse(req.body);
    const job = await Job.create({ ...data, createdBy: req.user._id });

    const candidateQuery = req.user.role === "Admin" ? {} : { uploadedBy: req.user._id };
    const candidates = await Candidate.find(candidateQuery);

    await Promise.all(
      candidates.map(async (candidate) => {
        const match = matchCandidateToJob(candidate, job);
        const filteredMatches = (candidate.matches || []).filter(
          (m) => m.job && m.job.toString() !== job._id.toString()
        );
        filteredMatches.push(match);
        filteredMatches.sort((a, b) => b.score - a.score);
        candidate.matches = filteredMatches;
        await candidate.save();
      })
    );

    res.status(201).json({ job });
  } catch (error) {
    next(error);
  }
}

export async function listJobs(req, res, next) {
  try {
    const { recruiterId } = req.query;
    let query = {};
    if (req.user.role === "Admin") {
      if (recruiterId) query.createdBy = recruiterId;
    } else {
      query.createdBy = req.user._id;
    }
    const jobs = await Job.find(query).populate("createdBy", "name email").sort("-createdAt");
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
}

export async function rankCandidatesForJob(req, res, next) {
  try {
    const jobQuery = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user._id };
    const job = await Job.findOne(jobQuery);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const candidateQuery = req.user.role === "Admin" ? {} : { uploadedBy: req.user._id };
    const candidates = await Candidate.find(candidateQuery);

    const ranking = candidates
      .map((candidate) => ({ candidate, match: matchCandidateToJob(candidate, job) }))
      .sort((a, b) => b.match.score - a.match.score);

    res.json({ job, ranking });
  } catch (error) {
    next(error);
  }
}

export async function toggleJobStatus(req, res, next) {
  try {
    const query = req.user.role === "Admin" ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user._id };
    const job = await Job.findOne(query);
    if (!job) return res.status(404).json({ message: "Job not found" });

    job.status = job.status === "open" ? "closed" : "open";
    await job.save();
    res.json({ job });
  } catch (error) {
    next(error);
  }
}
