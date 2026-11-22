import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api/client.js";

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/candidates", { params: { skill: query } });
        setResults(data.candidates.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  function select(candidate) {
    navigate(`/candidates/${candidate._id}`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-surface p-2 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
          <Search size={18} className="text-text-muted" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            placeholder="Search candidates by name or skill..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <kbd className="rounded-lg bg-elevated border border-border px-2 py-0.5 text-xs text-text-muted font-mono">
            Esc
          </kbd>
        </div>

        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((c) => (
              <li key={c._id}>
                <button
                  onClick={() => select(c)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left hover:bg-elevated transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-xs font-bold text-primary">
                    {c.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{c.name}</div>
                    <div className="text-xs text-text-muted truncate">
                      {(c.skills || []).slice(0, 4).join(" · ") || "No skills listed"}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{c.experienceYears || 0}y exp</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query && !loading && results.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No candidates found for "{query}"</p>
        )}

        <div className="border-t border-border/70 px-4 py-2 text-xs text-text-muted flex justify-between">
          <span>Search name, skills, or email</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
