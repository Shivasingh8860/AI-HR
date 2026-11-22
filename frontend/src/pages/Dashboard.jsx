import { 
  ChevronLeft, ChevronRight, Download, FileUp, Search, SlidersHorizontal, 
  Filter, Plus, LayoutGrid, LayoutList, Table as TableIcon, Star, Mail, 
  Phone, Calendar, MapPin, UserCheck, CheckCircle2, RotateCcw, X 
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import CandidateCard from "../components/CandidateCard.jsx";
import KanbanBoard from "../components/KanbanBoard.jsx";
import ScoreBar from "../components/ScoreBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const SORT_OPTIONS = [
  { label: "Newest First",      value: "-createdAt" },
  { label: "Oldest First",      value: "createdAt" },
  { label: "Highest Match",     value: "-matches.score" },
  { label: "Most Experience",   value: "-experienceYears" },
  { label: "Name (A–Z)",        value: "name" },
];

export default function Dashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ 
    skill: "", 
    minExperience: "", 
    minScore: "", 
    recruiterId: "",
    stage: ""
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "grid" | "table"

  useEffect(() => {
    if (user?.role === "Admin") {
      api.get("/admin/hr-stats")
        .then(({ data }) => setRecruiters(data.hrStats || []))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedFilters(filters); setPage(1); }, 250);
    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => { setPage(1); }, [sort]);

  useEffect(() => {
    setLoading(true);
    const params = {
      ...Object.fromEntries(Object.entries(debouncedFilters).filter(([, v]) => v)),
      sort, 
      page,
      limit: viewMode === "kanban" ? 60 : 12
    };
    api.get("/candidates", { params })
      .then(({ data }) => {
        setCandidates(data.candidates || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      })
      .catch(() => toast({ message: "Failed to fetch candidate pipeline.", type: "error" }))
      .finally(() => setLoading(false));
  }, [debouncedFilters, sort, page, viewMode]);

  function exportCSV() {
    if (!candidates.length) return;
    const header = ["Name", "Email", "Phone", "Experience (Years)", "Skills", "Top Matching Job", "Match Score (%)", "Pipeline Stage", "Shortlisted"];
    const rows = candidates.map((c) => {
      const topMatch = c.matches?.[0];
      return [
        `"${c.name}"`, 
        `"${c.email || ""}"`, 
        `"${c.phone || ""}"`,
        c.experienceYears || 0, 
        `"${(c.skills || []).join(", ")}"`,
        `"${topMatch?.jobTitle || "None"}"`, 
        topMatch?.score || 0,
        `"${c.stage || "new"}"`,
        c.shortlisted ? "Yes" : "No"
      ].join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidates_pipeline_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ message: "Candidate CSV exported successfully.", type: "success" });
  }

  function handleStageChange(candidateId, newStage) {
    setCandidates((prev) =>
      prev.map((c) => (c._id === candidateId ? { ...c, stage: newStage } : c))
    );
    api.patch(`/candidates/${candidateId}/stage`, { stage: newStage })
      .then(() => toast({ message: `Moved to ${newStage.toUpperCase()}`, type: "success" }))
      .catch(() => {
        toast({ message: "Failed to update stage. Reverting.", type: "error" });
        setDebouncedFilters({ ...debouncedFilters });
      });
  }

  async function toggleShortlist(candidateId, currentStatus) {
    try {
      const { data } = await api.patch(`/candidates/${candidateId}/shortlist`, { shortlisted: !currentStatus });
      setCandidates((prev) =>
        prev.map((c) => (c._id === candidateId ? { ...c, shortlisted: data.candidate.shortlisted } : c))
      );
      toast({ 
        message: data.candidate.shortlisted ? "Candidate shortlisted." : "Candidate removed from shortlist.", 
        type: "success" 
      });
    } catch {
      toast({ message: "Failed to update shortlist status.", type: "error" });
    }
  }

  const hasActiveFilters = Boolean(
    filters.skill || filters.minExperience || filters.minScore || filters.recruiterId || filters.stage
  );

  function resetFilters() {
    setFilters({ skill: "", minExperience: "", minScore: "", recruiterId: "", stage: "" });
  }

  // Quick pipeline counts from current candidates
  const counts = useMemo(() => {
    return {
      new: candidates.filter((c) => !c.stage || c.stage === "new").length,
      reviewing: candidates.filter((c) => c.stage === "reviewing").length,
      shortlisted: candidates.filter((c) => c.shortlisted || c.stage === "shortlisted").length,
      interview: candidates.filter((c) => c.stage === "interview").length,
      hired: candidates.filter((c) => c.stage === "hired").length,
    };
  }, [candidates]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Header */}
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Recruitment Pipeline
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Candidates
          </h1>
          <p className="mt-1 text-text-secondary text-xs sm:text-sm">
            {loading ? "Loading candidate pipeline..." : `Managing ${total} candidate profile(s) across stages.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            className="btn btn-secondary flex items-center gap-1.5" 
            onClick={exportCSV} 
            disabled={!candidates.length}
            title="Download candidates as CSV"
          >
            <Download size={15} /> 
            <span>Export CSV</span>
          </button>
          <Link to="/upload" className="btn btn-primary flex items-center gap-1.5">
            <Plus size={16} /> 
            <span>Upload Resumes</span>
          </Link>
        </div>
      </header>

      {/* Metric Strip Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card !p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total</span>
          <span className="text-2xl font-black text-text-primary mt-1">{total}</span>
        </div>
        <div className="card !p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Sourced / New</span>
          <span className="text-2xl font-black text-secondary mt-1">{counts.new}</span>
        </div>
        <div className="card !p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber uppercase tracking-wider flex items-center gap-1">
            <Star size={12} className="fill-amber" /> Shortlisted
          </span>
          <span className="text-2xl font-black text-amber mt-1">{counts.shortlisted}</span>
        </div>
        <div className="card !p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">Interviewing</span>
          <span className="text-2xl font-black text-accent mt-1">{counts.interview}</span>
        </div>
        <div className="card !p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Offered / Hired</span>
          <span className="text-2xl font-black text-primary mt-1">{counts.hired}</span>
        </div>
      </div>

      {/* Comprehensive Filter and View Control Bar */}
      <div className="card !p-4 space-y-3 bg-surface/70 border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-2.5 text-text-muted" size={15} />
            <input 
              className="field !bg-background !pl-10 text-xs sm:text-sm" 
              placeholder="Search by candidate name, skill, or email..." 
              value={filters.skill} 
              onChange={(e) => setFilters({ ...filters, skill: e.target.value })} 
            />
            {filters.skill && (
              <button 
                onClick={() => setFilters({ ...filters, skill: "" })}
                className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            <button 
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "kanban" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
              }`}
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button 
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "grid" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
              }`}
              onClick={() => setViewMode("grid")}
              title="Cards Grid View"
            >
              <LayoutList size={15} />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button 
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "table" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
              }`}
              onClick={() => setViewMode("table")}
              title="Data Table View"
            >
              <TableIcon size={15} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mr-1">
            <Filter size={13} />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Filters:</span>
          </div>

          <input 
            className="field !w-28 !py-1 text-xs" 
            type="number" 
            min="0"
            placeholder="Min Exp (yrs)" 
            value={filters.minExperience} 
            onChange={(e) => setFilters({ ...filters, minExperience: e.target.value })} 
          />

          <input 
            className="field !w-28 !py-1 text-xs" 
            type="number" 
            min="0"
            max="100"
            placeholder="Min Match %" 
            value={filters.minScore} 
            onChange={(e) => setFilters({ ...filters, minScore: e.target.value })} 
          />

          {user?.role === "Admin" && recruiters.length > 0 && (
            <select 
              className="field !w-36 !py-1 text-xs cursor-pointer" 
              value={filters.recruiterId} 
              onChange={(e) => setFilters({ ...filters, recruiterId: e.target.value })}
              title="Filter by recruiter"
            >
              <option value="">All Recruiters</option>
              {recruiters.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <select 
            className="field !w-36 !py-1 text-xs cursor-pointer ml-auto" 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button 
              onClick={resetFilters} 
              className="btn btn-secondary !py-1 !px-2.5 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
              title="Reset all active filters"
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Port */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-56 flex flex-col gap-3">
              <div className="skeleton h-7 w-2/5" />
              <div className="skeleton h-3.5 w-3/5" />
              <div className="skeleton flex-1 w-full" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center border-dashed">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated text-text-muted border border-border">
            <FileUp size={28} />
          </div>
          <h2 className="text-xl font-bold text-text-primary">No candidates found</h2>
          <p className="mt-1 max-w-sm text-text-secondary text-xs">
            {hasActiveFilters 
              ? "No candidates match the active search or filter criteria. Try clearing filters."
              : "Upload candidate resumes in PDF or DOCX format to parse and match them to open jobs."}
          </p>
          <div className="mt-5 flex gap-2">
            {hasActiveFilters && (
              <button onClick={resetFilters} className="btn btn-secondary text-xs">
                Reset Filters
              </button>
            )}
            <Link to="/upload" className="btn btn-primary text-xs">
              Upload Resumes
            </Link>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard candidates={candidates} onStageChange={handleStageChange} />
      ) : viewMode === "grid" ? (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate._id} candidate={candidate} />
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />
          )}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="space-y-6">
          <div className="card !p-0 overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/80 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Top Match</th>
                    <th className="py-3 px-4 min-w-[130px]">Match Score</th>
                    <th className="py-3 px-4">Stage</th>
                    {user?.role === "Admin" && <th className="py-3 px-4">Recruiter</th>}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {candidates.map((candidate) => {
                    const topMatch = candidate.matches?.[0];
                    return (
                      <tr 
                        key={candidate._id} 
                        className="hover:bg-elevated/40 transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {candidate.name?.[0]}
                            </div>
                            <div>
                              <Link 
                                to={`/candidates/${candidate._id}`}
                                className="font-bold text-text-primary hover:text-primary transition-colors text-xs truncate max-w-[170px] block"
                              >
                                {candidate.name}
                              </Link>
                              <div className="text-[11px] text-text-muted truncate max-w-[170px]">
                                {candidate.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-text-secondary font-medium">
                          {candidate.experienceYears || 0} yrs
                        </td>

                        <td className="py-3 px-4 text-text-secondary font-medium truncate max-w-[180px]">
                          {topMatch?.jobTitle || "Unmatched"}
                        </td>

                        <td className="py-3 px-4">
                          <div className="w-28">
                            <ScoreBar score={topMatch?.score || 0} />
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="badge badge-muted text-[10px] capitalize">
                            {candidate.stage || "new"}
                          </span>
                        </td>

                        {user?.role === "Admin" && (
                          <td className="py-3 px-4 text-[11px] text-text-muted truncate max-w-[130px]">
                            {candidate.uploadedBy?.name || "System"}
                          </td>
                        )}

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleShortlist(candidate._id, candidate.shortlisted)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                candidate.shortlisted
                                  ? "bg-amber/10 border-amber/30 text-amber"
                                  : "bg-surface border-border text-text-muted hover:text-amber"
                              }`}
                              title={candidate.shortlisted ? "Shortlisted" : "Add to shortlist"}
                            >
                              <Star size={13} className={candidate.shortlisted ? "fill-amber" : ""} />
                            </button>
                            <Link
                              to={`/candidates/${candidate._id}`}
                              className="btn btn-secondary !py-1 !px-2.5 text-[11px]"
                            >
                              Profile
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />
          )}
        </div>
      )}
    </div>
  );
}

function PaginationControls({ page, totalPages, setPage }) {
  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <button 
        className="btn btn-secondary !py-1.5 !px-3 disabled:opacity-30" 
        onClick={() => setPage((p) => Math.max(1, p - 1))} 
        disabled={page === 1}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-xs font-semibold text-text-muted">
        Page <span className="text-primary font-bold">{page}</span> of {totalPages}
      </div>
      <button 
        className="btn btn-secondary !py-1.5 !px-3 disabled:opacity-30" 
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
        disabled={page === totalPages}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
