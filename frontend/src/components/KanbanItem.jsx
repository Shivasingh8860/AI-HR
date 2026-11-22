import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import ScoreBar from "./ScoreBar.jsx";

export default function KanbanItem({ candidate, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate._id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1
  };

  const topMatch = candidate.matches?.[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card !p-3.5 flex flex-col gap-2.5 group relative bg-surface border border-border/80 hover:border-slate-600 transition-all ${
        isOverlay
          ? "shadow-2xl border-primary/60 rotate-1 scale-105 z-50 ring-2 ring-primary/20"
          : "shadow-sm cursor-grab active:cursor-grabbing"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing p-0.5"
          title="Drag to change stage"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0 pr-5">
          <Link
            to={`/candidates/${candidate._id}`}
            className="font-bold text-xs sm:text-sm text-text-primary hover:text-primary truncate block transition-colors"
          >
            {candidate.name}
          </Link>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5">
            <span className="truncate">{candidate.experienceYears || 0}y exp</span>
            <span>·</span>
            <span className="truncate">{topMatch?.jobTitle || "Unmatched"}</span>
          </div>
        </div>

        {candidate.shortlisted && (
          <div className="absolute right-3 top-3 text-amber">
            <Star size={13} className="fill-amber" />
          </div>
        )}
      </div>

      {/* Score bar */}
      <div className="pl-6 space-y-1.5">
        <ScoreBar score={topMatch?.score || 0} />

        {/* Skills preview */}
        <div className="flex flex-wrap gap-1 pt-1">
          {(candidate.skills || []).slice(0, 2).map((skill) => (
            <span
              key={skill}
              className="rounded bg-background border border-border px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary uppercase"
            >
              {skill}
            </span>
          ))}
          {candidate.skills?.length > 2 && (
            <span className="text-[9px] text-text-muted font-bold self-center">
              +{candidate.skills.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
