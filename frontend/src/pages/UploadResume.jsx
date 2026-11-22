import { 
  CheckCircle2, Clock, FileUp, XCircle, FileText, ShieldCheck, 
  Trash2, ArrowRight, Zap, Check 
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

export default function UploadResume() {
  const navigate = useNavigate();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState([]); 
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFileChange(e) {
    const selected = Array.from(e.target.files);
    addFiles(selected);
  }

  function addFiles(newFiles) {
    const combined = [...files, ...newFiles];
    setFiles(combined);
    setFileStatuses(combined.map((f) => ({ name: f.name, size: f.size, status: "waiting" })));
  }

  function removeFile(index) {
    if (uploading) return;
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setFileStatuses(updatedFiles.map((f) => ({ name: f.name, size: f.size, status: "waiting" })));
  }

  function onDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
      const ext = file.name.toLowerCase();
      return ext.endsWith(".pdf") || ext.endsWith(".docx");
    });
    if (droppedFiles.length) {
      addFiles(droppedFiles);
    } else {
      toast({ message: "Only PDF and DOCX files are supported.", type: "error" });
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  async function submit(event) {
    event.preventDefault();
    if (!files.length) return;
    setUploading(true);

    setFileStatuses(files.map((f) => ({ name: f.name, size: f.size, status: "processing" })));

    const form = new FormData();
    for (const file of files) form.append("resumes", file);

    try {
      const { data } = await api.post("/candidates/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFileStatuses(files.map((f) => ({ name: f.name, size: f.size, status: "done" })));
      toast({ message: `Successfully processed ${data.candidates.length} resume(s).`, type: "success" });
      setTimeout(() => {
        if (data.candidates.length === 1) navigate(`/candidates/${data.candidates[0]._id}`);
        else navigate("/");
      }, 1000);
    } catch (err) {
      setFileStatuses(files.map((f) => ({ name: f.name, size: f.size, status: "error" })));
      toast({ message: err.response?.data?.message || "Failed to process resumes.", type: "error" });
    } finally {
      setUploading(false);
    }
  }

  const statusIcon = (status) => {
    if (status === "waiting") return <Clock size={14} className="text-text-muted" />;
    if (status === "processing") return <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />;
    if (status === "done") return <CheckCircle2 size={14} className="text-primary" />;
    if (status === "error") return <XCircle size={14} className="text-rose-500" />;
  };

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 animate-fade-in pb-16">
      <header className="text-center max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
          Upload Resumes
        </h1>
        <p className="mt-2 text-text-secondary text-sm sm:text-base">
          Upload candidate resumes in PDF or DOCX format to automatically extract skills, work history, and match them against active job postings.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Guidance Left Card */}
        <section className="card bg-surface/50 border-border flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" /> Ingestion Guidelines
            </h2>
            <ul className="space-y-3.5">
              {[
                {
                  icon: FileText,
                  title: "Supported Formats",
                  desc: "PDF (.pdf) and Microsoft Word (.docx) files up to 10 MB each."
                },
                {
                  icon: Zap,
                  title: "Automated Data Extraction",
                  desc: "Candidate contact info, skills, experience duration, and education are parsed into structured data."
                },
                {
                  icon: Check,
                  title: "Instant Role Matching",
                  desc: "Every uploaded candidate is immediately evaluated and scored against all open positions."
                }
              ].map((item, i) => (
                <li key={i} className="flex gap-3 p-3 rounded-xl bg-background border border-border">
                  <item.icon size={18} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-text-primary">{item.title}</div>
                    <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-text-secondary">
            Tip: You can select multiple resumes at once or drop a whole folder of PDF files.
          </div>
        </section>

        {/* Upload Form Right Card */}
        <form onSubmit={submit} className="card border-border shadow-md flex flex-col justify-between">
          <div>
            {/* Drag and Drop Zone */}
            <label
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`group flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-all ${
                uploading
                  ? "border-border bg-background/50 cursor-not-allowed"
                  : isDragOver
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-elevated border border-border ${uploading ? "animate-pulse" : "group-hover:scale-105 transition-transform"}`}>
                <FileUp className={uploading ? "text-text-muted" : "text-primary"} size={22} />
              </div>
              <span className="text-sm font-bold text-text-primary">
                {isDragOver ? "Drop files to attach" : "Choose resumes or drag & drop"}
              </span>
              <span className="mt-1 text-xs text-text-muted">
                PDF or DOCX · Multi-file batch supported
              </span>
              <input
                className="hidden"
                type="file"
                multiple
                accept=".pdf,.docx"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>

            {/* Attached Files List */}
            {fileStatuses.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted px-1">
                  <span>Attached ({files.length} files)</span>
                  <span>{formatFileSize(totalSize)}</span>
                </div>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {fileStatuses.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-background border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <FileText size={14} className="text-primary shrink-0" />
                        <span className="truncate font-medium text-text-secondary">{f.name}</span>
                        <span className="text-[10px] text-text-muted shrink-0">({formatFileSize(f.size)})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase">
                          {statusIcon(f.status)}
                          <span className={f.status === "done" ? "text-primary" : "text-text-muted"}>{f.status}</span>
                        </span>
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-text-muted hover:text-rose-400 p-1"
                            title="Remove file"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-6 h-11 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
            disabled={!files.length || uploading}
          >
            {uploading ? (
              <span>Extracting and Matching Resumes...</span>
            ) : (
              <>
                <span>Process {files.length ? `${files.length} Resume(s)` : "Resumes"}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
