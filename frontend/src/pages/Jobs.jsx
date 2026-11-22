import { 
  Briefcase, Plus, ToggleLeft, ToggleRight, Layers, UserCheck, 
  Search, Filter, X, Award, Users, ChevronRight, Star, ExternalLink 
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import ScoreBar from "../components/ScoreBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const EMPTY_FORM = {
  title: "",
  department: "",
  description: "",
  requiredSkills: "",
  preferredEducation: "Bachelor",
  minExperienceYears: 2
};

export default function Jobs() {
  const toast = useToast();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [recruiterFilter, setRecruiterFilter] = useState("");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rankJob, setRankJob] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  function load() {
    setLoading(true);
    const params = {};
    if (recruiterFilter) params.recruiterId = recruiterFilter;
    api.get("/jobs", { params })
      .then(({ data }) => setJobs(data.jobs || []))
      .catch(() => toast({ message: "Failed to load job postings.", type: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.role === "Admin") {
      api.get("/admin/hr-stats")
        .then(({ data }) => setRecruiters(data.hrStats || []))
        .catch(() => {});
    }
  }, [user]);

  useEffect(load, [recruiterFilter]);

  async function toggleStatus(job) {
    try {
      const { data } = await api.patch(`/jobs/${job._id}/toggle-status`);
      setJobs((prev) => prev.map((j) => (j._id === job._id ? data.job : j)));
      toast({ message: `Job marked as ${data.job.status.toUpperCase()}`, type: "info" });
    } catch {
      toast({ message: "Failed to update job status.", type: "error" });
    }
  }

  async function openRankings(job) {
    setRankJob(job);
    setLoadingRankings(true);
    try {
      const { data } = await api.get(`/jobs/${job._id}/rankings`);
      setRankings(data.ranking || []);
    } catch {
      toast({ message: "Failed to load candidate rankings for this job.", type: "error" });
    } finally {
      setLoadingRankings(false);
    }
  }

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase()) ||
      (j.requiredSkills || []).some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCount = jobs.filter((j) => j.status === "open").length;
  const closedCount = jobs.filter((j) => j.status === "closed").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Briefcase size={15} /> Position Management
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Job Openings
          </h1>
          <p className="mt-1 text-text-secondary text-sm">
            Configure job specifications to rank candidates using the multi-factor scoring engine.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary self-start sm:self-auto flex items-center gap-2"
        >
          <Plus size={18} /> Post New Job
        </button>
      </header>

      {/* Aggregate Metric Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Positions</span>
          <span className="text-2xl font-black text-text-primary mt-1">{jobs.length}</span>
        </div>
        <div className="card !p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Active Openings</span>
          <span className="text-2xl font-black text-primary mt-1">{openCount}</span>
        </div>
        <div className="card !p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Closed Roles</span>
          <span className="text-2xl font-black text-text-secondary mt-1">{closedCount}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/50 p-3.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-2.5 text-text-muted" />
          <input
            className="field !bg-background !pl-10 text-xs sm:text-sm"
            placeholder="Search jobs by title, department, or required skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "Admin" && recruiters.length > 0 && (
            <select
              className="field !bg-background !w-40 py-1.5 text-xs cursor-pointer"
              value={recruiterFilter}
              onChange={(e) => setRecruiterFilter(e.target.value)}
              title="Filter by recruiter"
            >
              <option value="">All Recruiters</option>
              {recruiters.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
          )}

          <div className="flex gap-1 rounded-xl bg-background border border-border p-1">
            {["all", "open", "closed"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-all ${
                  statusFilter === f
                    ? "bg-surface text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-48 bg-elevated rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-20 border-dashed">
          <Briefcase size={36} className="mx-auto text-text-muted mb-3" />
          <h3 className="text-base font-bold text-text-primary">No positions found</h3>
          <p className="text-xs text-text-muted mt-1">Try clearing your filters or create a new job posting.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((job) => (
            <article key={job._id} className="card flex flex-col justify-between group border-border hover:border-slate-600 transition-all">
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-text-muted">
                      <span className="font-semibold text-text-secondary">{job.department}</span>
                      <span>·</span>
                      <span>{job.minExperienceYears}+ yrs experience</span>
                      {job.preferredEducation && (
                        <>
                          <span>·</span>
                          <span>{job.preferredEducation}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStatus(job)}
                    className="btn btn-secondary text-xs !py-1 !px-2.5 flex items-center gap-1.5 shrink-0"
                    title={job.status === "open" ? "Click to close role" : "Click to reopen role"}
                  >
                    {job.status === "closed" ? (
                      <>
                        <ToggleLeft size={16} className="text-text-muted" />
                        <span>Closed</span>
                      </>
                    ) : (
                      <>
                        <ToggleRight size={16} className="text-primary" />
                        <span className="text-primary font-bold">Open</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs leading-relaxed text-text-secondary line-clamp-2 mt-2">
                  {job.description}
                </p>

                {/* Skills pills */}
                {(job.requiredSkills || []).length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((skill) => (
                      <span className="badge badge-muted text-[10px] uppercase font-semibold" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom footer */}
              <div className="mt-5 pt-3 border-t border-border/80 flex items-center justify-between">
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  {job.createdBy?.name ? `Posted by ${job.createdBy.name}` : "Active listing"}
                </span>

                <button
                  onClick={() => openRankings(job)}
                  className="btn btn-secondary text-xs !py-1 !px-3 flex items-center gap-1.5 text-primary hover:border-primary/40"
                  title="Rank all candidates for this job"
                >
                  <Users size={14} />
                  <span>Rank Candidates</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal: Create Job */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            load();
          }}
        />
      )}

      {/* Modal: Ranked Candidates */}
      {rankJob && (
        <RankingsModal
          job={rankJob}
          rankings={rankings}
          loading={loadingRankings}
          onClose={() => setRankJob(null)}
        />
      )}
    </div>
  );
}

// Modal: Create Job
function CreateJobModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/jobs", {
        ...form,
        minExperienceYears: Number(form.minExperienceYears) || 0,
        requiredSkills: form.requiredSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      });
      toast({ message: "Job posting published successfully.", type: "success" });
      onSuccess();
    } catch (err) {
      toast({ message: err.response?.data?.message || "Failed to create job posting.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg bg-surface border-border shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Plus size={18} className="text-primary" /> Post New Job Opening
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Job Title</label>
            <input
              required
              className="field"
              placeholder="e.g. Senior Frontend Engineer"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Department</label>
            <input
              required
              className="field"
              placeholder="e.g. Product Engineering"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Job Description</label>
            <textarea
              required
              className="field min-h-[100px] py-2"
              placeholder="Describe core responsibilities and technical expectations..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Required Technical Skills (comma separated)
            </label>
            <input
              className="field"
              placeholder="React, TypeScript, Node.js, AWS"
              value={form.requiredSkills}
              onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Min Experience (Years)</label>
              <input
                type="number"
                min="0"
                className="field"
                value={form.minExperienceYears}
                onChange={(e) => setForm({ ...form, minExperienceYears: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Preferred Education</label>
              <input
                className="field"
                placeholder="e.g. Bachelor, Master"
                value={form.preferredEducation}
                onChange={(e) => setForm({ ...form, preferredEducation: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? "Publishing..." : "Publish Job Opening"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal: Candidate Rankings for a Job
function RankingsModal({ job, rankings, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-2xl bg-surface border-border shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-text-primary">Ranked Candidates: {job.title}</h2>
            <p className="text-xs text-text-muted">{job.department} · {rankings.length} evaluated candidate(s)</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {loading ? (
            <div className="py-16 text-center text-xs text-text-muted animate-pulse">
              Computing candidate matches against job criteria...
            </div>
          ) : rankings.length === 0 ? (
            <div className="py-16 text-center text-xs text-text-muted">
              No candidates found to rank for this position. Upload resumes to see rankings.
            </div>
          ) : (
            rankings.map(({ candidate, match }, index) => (
              <div
                key={candidate._id}
                className="flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0 ? "bg-amber text-background" : index === 1 ? "bg-slate-300 text-background" : index === 2 ? "bg-amber-700 text-white" : "bg-elevated text-text-muted"
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <Link
                      to={`/candidates/${candidate._id}`}
                      className="font-bold text-xs text-text-primary hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{candidate.name}</span>
                      <ExternalLink size={12} className="opacity-60" />
                    </Link>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      {candidate.experienceYears || 0}y exp · {(candidate.skills || []).slice(0, 3).join(", ")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24">
                    <ScoreBar score={match?.score || 0} />
                  </div>
                  <span className={`badge ${match?.score >= 80 ? "badge-primary" : match?.score >= 60 ? "badge-secondary" : "badge-rose"} text-[10px]`}>
                    {match?.score || 0}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-xs py-1.5 px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
