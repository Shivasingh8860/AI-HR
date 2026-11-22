import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import KanbanItem from "./KanbanItem.jsx";

const STAGE_THEMES = {
  new: { dot: "bg-slate-400", border: "border-slate-500/20" },
  reviewing: { dot: "bg-sky-400", border: "border-sky-500/20" },
  shortlisted: { dot: "bg-purple-400", border: "border-purple-500/20" },
  interview: { dot: "bg-amber-400", border: "border-amber-500/20" },
  hired: { dot: "bg-emerald-400", border: "border-emerald-500/20" },
  rejected: { dot: "bg-rose-400", border: "border-rose-500/20" },
};

export default function KanbanColumn({ stage, items = [] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const theme = STAGE_THEMES[stage.id] || STAGE_THEMES.new;

  return (
    <div className="flex flex-col w-[300px] sm:w-[320px] shrink-0">
      {/* Column Header */}
      <div className="mb-2.5 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
          <h3 className="font-bold text-text-primary text-xs tracking-wider uppercase">
            {stage.title}
          </h3>
        </div>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface border border-border text-[10px] font-bold text-text-muted">
          {items.length}
        </span>
      </div>

      {/* Droppable Body */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl border p-2 transition-all min-h-[300px] overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar ${
          isOver
            ? "bg-primary/5 border-primary/40 ring-2 ring-primary/10"
            : "bg-surface/30 border-border/80"
        }`}
      >
        <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2.5 min-h-[160px]">
            {items.map((candidate) => (
              <KanbanItem key={candidate._id} candidate={candidate} />
            ))}
            {items.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/60 text-center text-[11px] text-text-muted">
                Drop candidate here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
