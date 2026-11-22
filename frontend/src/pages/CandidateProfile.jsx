import { 
  Download, RefreshCcw, Star, Trash2, Mail, Phone, Briefcase, GraduationCap, 
  Award, BookOpen, MessageSquare, Trash, UserCheck, Copy, Check, ExternalLink, 
  ChevronDown, ChevronUp, FileText 
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import ScoreBar from "../components/ScoreBar.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function CandidateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [resumeExpanded, setResumeExpanded] = useState(true);

  function load() {
    setLoading(true);
    api.get(`/candidates/${id}`)
      .then(({ data }) => setCandidate(data.candidate))
      .catch(() => toast({ message: "Failed to fetch candidate profile.", type: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "s" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey && candidate) {
        shortlist();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [candidate]);

  async function shortlist() {
    try {
      const { data } = await api.patch(`/candidates/${id}/shortlist`, { shortlisted: !candidate.shortlisted });
      setCandidate(data.candidate);
      toast({ message: data.candidate.shortlisted ? "Candidate added to shortlist." : "Candidate removed from shortlist.", type: "success" });
    } catch {
      toast({ message: "Failed to update shortlist status.", type: "error" });
    }
  }

  async function rematch() {
    try {
      toast({ message: "Re-evaluating matches against active jobs...", type: "info" });
      const { data } = await api.post(`/candidates/${id}/rematch`);
      setCandidate(data.candidate);
      toast({ message: "Candidate re-evaluated successfully.", type: "success" });
    } catch {
      toast({ message: "Failed to re-evaluate matches.", type: "error" });
    }
  }

  async function downloadReport() {
    try {
      const { data } = await api.get(`/candidates/${id}/report`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${candidate.name.replace(/\s+/g, "_")}_report.txt`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ message: "Report downloaded successfully.", type: "success" });
    } catch {
      toast({ message: "Failed to download report.", type: "error" });
    }
  }

  async function deleteCandidate() {
    if (!window.confirm(`Are you sure you want to delete ${candidate.name}?`)) return;
    try {
      await api.delete(`/candidates/${id}`);
      toast({ message: "Candidate profile deleted.", type: "success" });
      navigate("/");
    } catch {
      toast({ message: "Failed to delete candidate.", type: "error" });
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      const { data } = await api.post(`/candidates/${id}/notes`, { text: noteText });
      setCandidate((prev) => ({ ...prev, notes: data.notes }));
      setNoteText("");
      toast({ message: "Note added.", type: "success" });
    } catch {
      toast({ message: "Failed to add note.", type: "error" });
    }
  }

  async function removeNote(noteId) {
    try {
      const { data } = await api.delete(`/candidates/${id}/notes/${noteId}`);
      setCandidate((prev) => ({ ...prev, notes: data.notes }));
    } catch {
      toast({ message: "Failed to remove note.", type: "error" });
    }
  }

  async function changeStage(stage) {
    try {
      const { data } = await api.patch(`/candidates/${id}/stage`, { stage });
      setCandidate((prev) => ({ ...prev, stage: data.candidate.stage }));
      toast({ message: `Pipeline stage updated: ${stage.toUpperCase()}`, type: "success" });
    } catch {
      toast({ message: "Failed to update pipeline stage.", type: "error" });
    }
  }

  function copyQuestion(text, index) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ message: "Interview question copied to clipboard.", type: "success" });
  }

  if (loading) return <CandidateSkeleton />;
  if (!candidate) return <div className="p-20 text-center text-text-muted font-bold text-xl">Candidate not found.</div>;
  
  const topMatch = candidate.matches?.[0];
  const breakdown = topMatch?.breakdown;

  const resumeUrl = candidate.resumeFile?.url || (
    candidate.resumeFile?.path
      ? `${api.defaults.baseURL.replace("/api", "")}/${candidate.resumeFile.path.replace(/\\/g, "/")}`
      : null
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20">
      {/* Top Profile Header */}
      <header className="card !p-6 flex flex-col justify-between gap-6 md:flex-row md:items-start bg-surface/80 border-border">
        <div className="flex gap-4 sm:gap-5 items-center">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl sm:text-3xl font-extrabold shadow-sm shrink-0">
            {candidate.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                {candidate.name}
              </h1>
              {candidate.shortlisted && (
                <span className="badge badge-amber text-xs py-0.5">
                  <Star size={11} className="fill-amber" /> Shortlisted
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary">
              {candidate.email && (
                <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <Mail size={14} className="text-primary" /> {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <a href={`tel:${candidate.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <Phone size={14} className="text-primary" /> {candidate.phone}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Briefcase size={14} className="text-primary" /> {candidate.experienceYears || 0} Years Exp
              </span>
              {candidate.uploadedBy?.name && (
                <span className="flex items-center gap-1.5 text-text-muted">
                  <UserCheck size={14} className="text-secondary" /> Recruiter: {candidate.uploadedBy.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button 
            className={`btn text-xs ${candidate.shortlisted ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={shortlist}
            title="Toggle candidate shortlist status"
          >
            <Star size={14} className={candidate.shortlisted ? 'fill-current' : ''} />
            <span>{candidate.shortlisted ? "Shortlisted" : "Shortlist"}</span>
          </button>

          <button 
            className="btn btn-secondary text-xs" 
            onClick={rematch}
            title="Re-run matching algorithm against current jobs"
          >
            <RefreshCcw size={14} /> 
            <span>Re-evaluate</span>
          </button>

          <button 
            className="btn btn-secondary text-xs" 
            onClick={downloadReport}
            title="Download summary report"
          >
            <Download size={14} /> 
            <span className="hidden sm:inline">Export Report</span>
          </button>

          <button 
            className="btn btn-danger text-xs !px-2.5" 
            onClick={deleteCandidate}
            title="Permanently delete candidate profile"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {/* Main Grid Columns */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Pipeline Stage Stepper */}
          <StagePipeline current={candidate.stage || "new"} onChange={changeStage} />

          {/* Executive AI / Resume Summary */}
          {candidate.analysis?.summary && (
            <section className="card bg-surface/60 border-border">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2.5">
                <MessageSquare size={14} /> Executive Summary
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">
                {candidate.analysis.summary}
              </p>
            </section>
          )}

          {/* Core Skills & Work Experience */}
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Technical & Core Skills" icon={Award} items={candidate.skills} isBadge />
            <SectionCard title="Work History" icon={Briefcase} items={candidate.workExperience} />
          </div>

          {/* Education & Notable Projects */}
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Education" icon={GraduationCap} items={candidate.education} />
            <SectionCard title="Projects & Highlights" icon={BookOpen} items={candidate.projects} />
          </div>

          {/* Recruiter Notes Section */}
          <section className="card">
            <h2 className="text-base font-bold text-text-primary mb-3">Recruiter Interview Notes</h2>
            <form onSubmit={addNote} className="flex gap-2.5 mb-5">
              <input
                className="field !bg-background text-xs sm:text-sm"
                placeholder="Log interview feedback, strengths, or follow-up notes..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button className="btn btn-primary text-xs shrink-0" disabled={!noteText.trim()}>
                Add Note
              </button>
            </form>

            <div className="space-y-2">
              {(candidate.notes || []).length === 0 ? (
                <div className="p-5 text-center border border-dashed border-border rounded-xl text-text-muted text-xs">
                  No notes recorded yet. Add your interview feedback above.
                </div>
              ) : (
                candidate.notes.map((note) => (
                  <div key={note._id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-background border border-border group">
                    <p className="text-xs text-text-secondary leading-relaxed flex-1">{note.text}</p>
                    <button 
                      onClick={() => removeNote(note._id)} 
                      className="text-text-muted hover:text-rose-400 transition-colors p-1"
                      title="Delete note"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Sidebar Column */}
        <aside className="space-y-6">
          {/* Top Job Match Evaluation */}
          <div className="card border-primary/20 bg-surface">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Top Match Role</span>
              {topMatch && <span className="badge badge-primary text-[10px]">{topMatch.score}% Match</span>}
            </div>

            <h3 className="text-base font-bold text-primary mb-3">
              {topMatch?.jobTitle || "No matching jobs evaluated"}
            </h3>

            <ScoreBar score={topMatch?.score || 0} />

            {/* Score Breakdown Bars */}
            {breakdown && (
              <div className="mt-4 pt-3 border-t border-border space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                  Scoring Breakdown (100 pts)
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <div className="text-text-muted text-[10px]">Skills (40)</div>
                    <div className="font-bold text-text-primary mt-0.5">{breakdown.skillOverlap} pts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <div className="text-text-muted text-[10px]">Experience (30)</div>
                    <div className="font-bold text-text-primary mt-0.5">{breakdown.experienceRelevance} pts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <div className="text-text-muted text-[10px]">Education (10)</div>
                    <div className="font-bold text-text-primary mt-0.5">{breakdown.educationFit} pts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border">
                    <div className="text-text-muted text-[10px]">Keywords (20)</div>
                    <div className="font-bold text-text-primary mt-0.5">{breakdown.keywordSimilarity} pts</div>
                  </div>
                </div>
              </div>
            )}

            {topMatch?.reasoning && (
              <p className="mt-3 text-xs leading-relaxed text-text-secondary bg-background rounded-xl p-3 border border-border">
                {topMatch.reasoning}
              </p>
            )}
          </div>

          {/* Missing Skills */}
          {(topMatch?.missingSkills?.length > 0 || candidate.analysis?.skillGaps?.length > 0) && (
            <div className="card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2.5">
                Missing Skills for Target Job
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(topMatch?.missingSkills || candidate.analysis?.skillGaps || []).map((skill) => (
                  <span key={skill} className="badge bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Interview Questions */}
          {(candidate.analysis?.interviewQuestions || []).length > 0 && (
            <div className="card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-3">
                Suggested Interview Questions
              </h3>
              <ul className="space-y-2.5">
                {candidate.analysis.interviewQuestions.map((q, i) => (
                  <li key={i} className="text-xs text-text-secondary p-2.5 rounded-xl bg-background border border-border flex items-start justify-between gap-2">
                    <div className="leading-relaxed">
                      <span className="text-primary font-bold mr-1.5">{i + 1}.</span>
                      {q}
                    </div>
                    <button
                      onClick={() => copyQuestion(q, i)}
                      className="text-text-muted hover:text-text-primary p-1 shrink-0 transition-colors"
                      title="Copy question"
                    >
                      {copiedIndex === i ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Resume Document Viewer */}
      {resumeUrl && (
        <section className="card !p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <FileText size={16} className="text-primary" />
              <span>Original Resume Document</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open in Tab</span>
              </a>
              <button
                onClick={() => setResumeExpanded(!resumeExpanded)}
                className="btn btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1"
              >
                {resumeExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{resumeExpanded ? "Collapse" : "Expand"}</span>
              </button>
            </div>
          </div>

          {resumeExpanded && (
            <div className="rounded-xl overflow-hidden border border-border bg-white h-[650px] shadow-sm animate-fade-in">
              <iframe
                src={resumeUrl}
                className="h-full w-full"
                title="Resume PDF Document"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, items = [], isBadge = false }) {
  if (!items || !items.length) return null;
  return (
    <section className="card">
      <div className="flex items-center gap-2 font-bold text-text-primary mb-3 text-xs uppercase tracking-wider">
        <Icon size={14} className="text-primary" />
        {title}
      </div>
      {isBadge ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span className="badge badge-muted py-1 px-2.5 text-xs" key={item}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <ul className="space-y-2 text-xs text-text-secondary">
          {items.map((item, idx) => (
            <li key={idx} className="p-2 rounded-lg bg-background border border-border/80 leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CandidateSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="card h-28 bg-elevated" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="h-20 bg-elevated rounded-2xl" />
          <div className="h-44 bg-elevated rounded-2xl" />
        </div>
        <div className="h-80 bg-elevated rounded-2xl" />
      </div>
    </div>
  );
}

const STAGES = [
  { key: "new",         label: "Sourced",     color: "border-slate-500 text-slate-300" },
  { key: "reviewing",   label: "Reviewing",   color: "border-sky-400 text-sky-300" },
  { key: "shortlisted", label: "Shortlisted", color: "border-purple-400 text-purple-300" },
  { key: "interview",   label: "Interview",   color: "border-amber-400 text-amber-300" },
  { key: "hired",       label: "Hired",       color: "border-emerald-400 text-emerald-300" },
  { key: "rejected",    label: "Rejected",    color: "border-rose-500 text-rose-400" },
];

function StagePipeline({ current, onChange }) {
  return (
    <div className="card !p-3.5 bg-background/50 border-border">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Pipeline Stage</span>
        <span className="text-[11px] font-bold text-primary uppercase">{current}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {STAGES.map(({ key, label, color }) => {
          const isActive = current === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`rounded-xl py-2 px-2 text-xs font-bold transition-all border text-center ${
                isActive
                  ? `${color} bg-white/10 shadow-sm ring-1 ring-white/10`
                  : "bg-surface border-border text-text-muted hover:border-border-hover hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
