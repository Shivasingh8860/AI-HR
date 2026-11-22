import bcrypt from "bcryptjs";
import { getSupabase } from "../config/supabase.js";

// Helper to normalize Supabase row to mongoose-like instance
function normalizeUserRow(row) {
  if (!row) return null;
  const user = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role || "HR",
    isActive: row.is_active !== false,
    isVerified: row.is_verified !== false,
    googleId: row.google_id || null,
    resetPasswordToken: row.reset_password_token || null,
    resetPasswordExpires: row.reset_password_expires ? new Date(row.reset_password_expires) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  user.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  };

  user.save = async function () {
    const supabase = getSupabase();
    let hashedPass = this.password;
    if (this._passwordModified && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
      hashedPass = await bcrypt.hash(this.password, 12);
    }
    const { data, error } = await supabase
      .from("users")
      .update({
        name: this.name,
        email: this.email?.toLowerCase(),
        password: hashedPass,
        role: this.role,
        is_active: this.isActive,
        is_verified: this.isVerified,
        google_id: this.googleId,
        reset_password_token: this.resetPasswordToken,
        reset_password_expires: this.resetPasswordExpires,
        updated_at: new Date().toISOString()
      })
      .eq("id", this._id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    Object.assign(this, normalizeUserRow(data));
    return this;
  };

  return user;
}

function normalizeJobRow(row) {
  if (!row) return null;
  const job = {
    _id: row.id,
    id: row.id,
    title: row.title,
    department: row.department,
    description: row.description,
    requiredSkills: Array.isArray(row.required_skills) ? row.required_skills : [],
    preferredEducation: row.preferred_education || "",
    minExperienceYears: Number(row.min_experience_years || 0),
    status: row.status || "open",
    createdBy: row.createdBy || row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  job.save = async function () {
    const supabase = getSupabase();
    const createdById = typeof this.createdBy === "object" ? this.createdBy?._id || this.createdBy?.id : this.createdBy;
    const { data, error } = await supabase
      .from("jobs")
      .update({
        title: this.title,
        department: this.department,
        description: this.description,
        required_skills: this.requiredSkills,
        preferred_education: this.preferredEducation,
        min_experience_years: this.minExperienceYears,
        status: this.status,
        created_by: createdById,
        updated_at: new Date().toISOString()
      })
      .eq("id", this._id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    Object.assign(this, normalizeJobRow(data));
    return this;
  };

  return job;
}

function normalizeCandidateRow(row) {
  if (!row) return null;
  const candidate = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    skills: Array.isArray(row.skills) ? row.skills : [],
    experienceYears: Number(row.experience_years || 0),
    workExperience: Array.isArray(row.work_experience) ? row.work_experience : [],
    education: Array.isArray(row.education) ? row.education : [],
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    projects: Array.isArray(row.projects) ? row.projects : [],
    resumeText: row.resume_text || "",
    resumeFile: row.resume_file || {},
    analysis: row.analysis || {},
    matches: Array.isArray(row.matches) ? row.matches : [],
    shortlisted: Boolean(row.shortlisted),
    stage: row.stage || "new",
    notes: Array.isArray(row.notes) ? row.notes : [],
    uploadedBy: row.uploadedBy || row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  candidate.save = async function () {
    const supabase = getSupabase();
    const uploadedById = typeof this.uploadedBy === "object" ? this.uploadedBy?._id || this.uploadedBy?.id : this.uploadedBy;
    const { data, error } = await supabase
      .from("candidates")
      .update({
        name: this.name,
        email: this.email,
        phone: this.phone,
        skills: this.skills,
        experience_years: this.experienceYears,
        work_experience: this.workExperience,
        education: this.education,
        certifications: this.certifications,
        projects: this.projects,
        resume_text: this.resumeText,
        resume_file: this.resumeFile,
        analysis: this.analysis,
        matches: this.matches,
        shortlisted: this.shortlisted,
        stage: this.stage,
        notes: this.notes,
        uploaded_by: uploadedById,
        updated_at: new Date().toISOString()
      })
      .eq("id", this._id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    Object.assign(this, normalizeCandidateRow(data));
    return this;
  };

  return candidate;
}

// -------------------------------------------------------------
// USER MODEL ADAPTER FOR SUPABASE
// -------------------------------------------------------------
export const SupabaseUser = {
  async findOne(query) {
    const supabase = getSupabase();
    if (!supabase) return null;

    let req = supabase.from("users").select("*");

    if (query.$or) {
      const orClauses = query.$or.map((clause) => {
        if (clause.googleId) return `google_id.eq.${clause.googleId}`;
        if (clause.email) return `email.ilike.${clause.email.toLowerCase()}`;
        return "";
      }).filter(Boolean);
      req = req.or(orClauses.join(","));
    } else if (query.email) {
      req = req.ilike("email", query.email.toLowerCase());
      if (query._id && query._id.$ne) {
        req = req.neq("id", query._id.$ne);
      }
    } else if (query.resetPasswordToken) {
      req = req.eq("reset_password_token", query.resetPasswordToken);
      if (query.resetPasswordExpires && query.resetPasswordExpires.$gt) {
        req = req.gt("reset_password_expires", new Date().toISOString());
      }
    } else if (query._id || query.id) {
      req = req.eq("id", query._id || query.id);
    }

    const { data, error } = await req.maybeSingle();
    if (error || !data) return null;
    return normalizeUserRow(data);
  },

  async findById(id) {
    return this.findOne({ _id: id });
  },

  async create(userData) {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured");

    const hashedPassword = userData.password.startsWith("$2a$") || userData.password.startsWith("$2b$")
      ? userData.password
      : await bcrypt.hash(userData.password, 12);

    const { data, error } = await supabase
      .from("users")
      .insert({
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || "HR",
        is_active: userData.isActive !== false,
        is_verified: userData.isVerified !== false,
        google_id: userData.googleId || null
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return normalizeUserRow(data);
  },

  find() {
    const supabase = getSupabase();
    const queryObj = {
      selectFields: "*",
      sortField: "created_at",
      sortAsc: false,
      async exec() {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from("users")
          .select(this.selectFields)
          .order(this.sortField, { ascending: this.sortAsc });
        if (error || !data) return [];
        return data.map(normalizeUserRow);
      },
      select(_fields) {
        return this;
      },
      sort(sortStr) {
        if (sortStr === "-createdAt") {
          this.sortField = "created_at";
          this.sortAsc = false;
        }
        return this;
      },
      lean() {
        return this;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      }
    };
    return queryObj;
  },

  async findByIdAndDelete(id) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.from("users").delete().eq("id", id).select().single();
    return normalizeUserRow(data);
  },

  async deleteMany() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("users").delete().neq("email", "impossible_match_email");
  }
};

// -------------------------------------------------------------
// JOB MODEL ADAPTER FOR SUPABASE
// -------------------------------------------------------------
export const SupabaseJob = {
  async create(jobData) {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured");

    const createdById = typeof jobData.createdBy === "object" ? jobData.createdBy?._id || jobData.createdBy?.id : jobData.createdBy;

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title: jobData.title,
        department: jobData.department,
        description: jobData.description,
        required_skills: jobData.requiredSkills || [],
        preferred_education: jobData.preferredEducation || "",
        min_experience_years: jobData.minExperienceYears || 0,
        status: jobData.status || "open",
        created_by: createdById
      })
      .select("*, createdBy:users(id, name, email)")
      .single();

    if (error) throw new Error(error.message);
    return normalizeJobRow(data);
  },

  async insertMany(jobsArray) {
    const results = [];
    for (const job of jobsArray) {
      results.push(await this.create(job));
    }
    return results;
  },

  find(filter = {}) {
    const supabase = getSupabase();
    const queryObj = {
      populateCreatedBy: false,
      sortField: "created_at",
      sortAsc: false,
      async exec() {
        if (!supabase) return [];
        let req = supabase.from("jobs").select("*, createdBy:users(id, name, email)");

        if (filter.createdBy) {
          req = req.eq("created_by", filter.createdBy);
        }

        req = req.order(this.sortField, { ascending: this.sortAsc });

        const { data, error } = await req;
        if (error || !data) return [];
        return data.map((row) => {
          const normalized = normalizeJobRow(row);
          if (row.createdBy) {
            normalized.createdBy = {
              _id: row.createdBy.id,
              name: row.createdBy.name,
              email: row.createdBy.email
            };
          }
          return normalized;
        });
      },
      populate() {
        this.populateCreatedBy = true;
        return this;
      },
      sort(sortStr) {
        if (sortStr === "-createdAt") {
          this.sortField = "created_at";
          this.sortAsc = false;
        }
        return this;
      },
      select() {
        return this;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      }
    };
    return queryObj;
  },

  async findOne(query) {
    const supabase = getSupabase();
    if (!supabase) return null;

    let req = supabase.from("jobs").select("*, createdBy:users(id, name, email)");
    if (query._id || query.id) {
      req = req.eq("id", query._id || query.id);
    }
    if (query.createdBy) {
      req = req.eq("created_by", query.createdBy);
    }

    const { data, error } = await req.maybeSingle();
    if (error || !data) return null;
    const normalized = normalizeJobRow(data);
    if (data.createdBy) {
      normalized.createdBy = {
        _id: data.createdBy.id,
        name: data.createdBy.name,
        email: data.createdBy.email
      };
    }
    return normalized;
  },

  async updateMany(filter, update) {
    const supabase = getSupabase();
    if (!supabase) return { modifiedCount: 0 };

    let req = supabase.from("jobs").update({
      created_by: update.createdBy,
      updated_at: new Date().toISOString()
    });

    if (filter.createdBy) {
      req = req.eq("created_by", filter.createdBy);
    }

    const { data, error } = await req.select("id");
    if (error) throw new Error(error.message);
    return { modifiedCount: data?.length || 0 };
  },

  async deleteMany(query = {}) {
    const supabase = getSupabase();
    if (!supabase) return;
    let req = supabase.from("jobs").delete();
    if (query.createdBy) {
      req = req.eq("created_by", query.createdBy);
    } else {
      req = req.neq("title", "impossible_match_job_title");
    }
    await req;
  },

  async countDocuments(query = {}) {
    const supabase = getSupabase();
    if (!supabase) return 0;
    let req = supabase.from("jobs").select("id", { count: "exact", head: true });
    if (query.createdBy) {
      req = req.eq("created_by", query.createdBy);
    }
    const { count, error } = await req;
    if (error) return 0;
    return count || 0;
  }
};

// -------------------------------------------------------------
// CANDIDATE MODEL ADAPTER FOR SUPABASE
// -------------------------------------------------------------
export const SupabaseCandidate = {
  async create(candidateData) {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase is not configured");

    const uploadedById = typeof candidateData.uploadedBy === "object"
      ? candidateData.uploadedBy?._id || candidateData.uploadedBy?.id
      : candidateData.uploadedBy;

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        name: candidateData.name,
        email: candidateData.email || "",
        phone: candidateData.phone || "",
        skills: candidateData.skills || [],
        experience_years: candidateData.experienceYears || 0,
        work_experience: candidateData.workExperience || [],
        education: candidateData.education || [],
        certifications: candidateData.certifications || [],
        projects: candidateData.projects || [],
        resume_text: candidateData.resumeText || "",
        resume_file: candidateData.resumeFile || {},
        analysis: candidateData.analysis || {},
        matches: candidateData.matches || [],
        shortlisted: Boolean(candidateData.shortlisted),
        stage: candidateData.stage || "new",
        notes: candidateData.notes || [],
        uploaded_by: uploadedById
      })
      .select("*, uploadedBy:users(id, name, email)")
      .single();

    if (error) throw new Error(error.message);
    return normalizeCandidateRow(data);
  },

  async insertMany(docs) {
    const results = [];
    for (const doc of docs) {
      results.push(await this.create(doc));
    }
    return results;
  },

  find(filter = {}) {
    const supabase = getSupabase();
    const queryObj = {
      skipVal: 0,
      limitVal: 100,
      sortField: "created_at",
      sortAsc: false,
      async exec() {
        if (!supabase) return [];
        let req = supabase.from("candidates").select("*, uploadedBy:users(id, name, email)");

        if (filter.uploadedBy) {
          req = req.eq("uploaded_by", filter.uploadedBy);
        }
        if (typeof filter.shortlisted === "boolean") {
          req = req.eq("shortlisted", filter.shortlisted);
        }
        if (filter.stage) {
          req = req.eq("stage", filter.stage);
        }
        if (filter.experienceYears?.$gte) {
          req = req.gte("experience_years", filter.experienceYears.$gte);
        }
        if (filter.$or) {
          // General search over name or email
          const firstTerm = filter.$or[0]?.name?.source || "";
          if (firstTerm) {
            req = req.or(`name.ilike.%${firstTerm}%,email.ilike.%${firstTerm}%`);
          }
        }

        req = req.order(this.sortField, { ascending: this.sortAsc });

        if (this.skipVal > 0) {
          req = req.range(this.skipVal, this.skipVal + this.limitVal - 1);
        } else if (this.limitVal < 1000) {
          req = req.limit(this.limitVal);
        }

        const { data, error } = await req;
        if (error || !data) return [];
        return data.map((row) => {
          const normalized = normalizeCandidateRow(row);
          if (row.uploadedBy) {
            normalized.uploadedBy = {
              _id: row.uploadedBy.id,
              name: row.uploadedBy.name,
              email: row.uploadedBy.email
            };
          }
          return normalized;
        });
      },
      populate() {
        return this;
      },
      sort(sortStr) {
        if (sortStr === "-createdAt") {
          this.sortField = "created_at";
          this.sortAsc = false;
        }
        return this;
      },
      skip(val) {
        this.skipVal = Number(val);
        return this;
      },
      limit(val) {
        this.limitVal = Number(val);
        return this;
      },
      select() {
        return this;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      }
    };
    return queryObj;
  },

  async countDocuments(filter = {}) {
    const supabase = getSupabase();
    if (!supabase) return 0;

    let req = supabase.from("candidates").select("id", { count: "exact", head: true });

    if (filter.uploadedBy) {
      req = req.eq("uploaded_by", filter.uploadedBy);
    }
    if (typeof filter.shortlisted === "boolean") {
      req = req.eq("shortlisted", filter.shortlisted);
    }
    if (filter.stage) {
      req = req.eq("stage", filter.stage);
    }
    if (filter.experienceYears?.$gte) {
      req = req.gte("experience_years", filter.experienceYears.$gte);
    }

    const { count, error } = await req;
    if (error) return 0;
    return count || 0;
  },

  async findOne(query) {
    const supabase = getSupabase();
    if (!supabase) return null;

    let req = supabase.from("candidates").select("*, uploadedBy:users(id, name, email)");

    if (query._id || query.id) {
      req = req.eq("id", query._id || query.id);
    }
    if (query.uploadedBy) {
      req = req.eq("uploaded_by", query.uploadedBy);
    }
    if (query.email) {
      req = req.ilike("email", query.email);
    }

    const { data, error } = await req.maybeSingle();
    if (error || !data) return null;
    const normalized = normalizeCandidateRow(data);
    if (data.uploadedBy) {
      normalized.uploadedBy = {
        _id: data.uploadedBy.id,
        name: data.uploadedBy.name,
        email: data.uploadedBy.email
      };
    }
    return normalized;
  },

  async findOneAndUpdate(query, update, options = {}) {
    const candidate = await this.findOne(query);
    if (!candidate) return null;

    if (update.shortlisted !== undefined) {
      candidate.shortlisted = update.shortlisted;
    }
    if (update.stage !== undefined) {
      candidate.stage = update.stage;
    }
    if (update.$push?.notes) {
      const note = {
        _id: `note-${Date.now()}`,
        id: `note-${Date.now()}`,
        ...update.$push.notes,
        createdAt: new Date().toISOString()
      };
      candidate.notes = [...(candidate.notes || []), note];
    }
    if (update.$pull?.notes) {
      const noteId = update.$pull.notes._id;
      candidate.notes = (candidate.notes || []).filter((n) => n._id !== noteId && n.id !== noteId);
    }

    await candidate.save();
    return candidate;
  },

  async findOneAndDelete(query) {
    const candidate = await this.findOne(query);
    if (!candidate) return null;

    const supabase = getSupabase();
    await supabase.from("candidates").delete().eq("id", candidate._id);
    return candidate;
  },

  async updateMany(filter, update) {
    const supabase = getSupabase();
    if (!supabase) return { modifiedCount: 0 };

    let req = supabase.from("candidates").update({
      uploaded_by: update.uploadedBy,
      updated_at: new Date().toISOString()
    });

    if (filter.uploadedBy) {
      req = req.eq("uploaded_by", filter.uploadedBy);
    }

    const { data, error } = await req.select("id");
    if (error) throw new Error(error.message);
    return { modifiedCount: data?.length || 0 };
  },

  async deleteMany(query = {}) {
    const supabase = getSupabase();
    if (!supabase) return;
    let req = supabase.from("candidates").delete();
    if (query.uploadedBy) {
      req = req.eq("uploaded_by", query.uploadedBy);
    } else {
      req = req.neq("name", "impossible_match_candidate_name");
    }
    await req;
  }
};
