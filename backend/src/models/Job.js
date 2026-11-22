import mongoose from "mongoose";
import { isSupabaseConfigured } from "../config/supabase.js";
import { SupabaseJob } from "./supabaseAdapter.js";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requiredSkills: [{ type: String, trim: true }],
    preferredEducation: { type: String, trim: true },
    minExperienceYears: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const MongoJob = mongoose.models.Job || mongoose.model("Job", jobSchema);

const JobProxy = new Proxy(MongoJob, {
  get(target, prop) {
    if (isSupabaseConfigured() && prop in SupabaseJob) {
      return SupabaseJob[prop];
    }
    return target[prop];
  },
  construct(target, args) {
    if (isSupabaseConfigured()) {
      const data = args[0] || {};
      const instance = {
        _id: data._id || data.id,
        id: data.id || data._id,
        ...data,
        save: async () => {
          if (!instance._id) {
            const created = await SupabaseJob.create(instance);
            Object.assign(instance, created);
            return instance;
          }
          return SupabaseJob.create(instance);
        }
      };
      return instance;
    }
    return new target(...args);
  }
});

export default JobProxy;
