import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { Archive, Check, ChevronDown, Trash2, Undo2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useQuickIdeas } from "../../hooks/useQuickIdeas";
import { formatRelativeTime } from "../../lib/dates";
import type { QuickIdea } from "../../types";

export function QuickIdeas() {
  const { user } = useAuth();
  const { ideas, addIdea, toggleComplete, toggleArchive, deleteIdea } = useQuickIdeas(user?.uid);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [filter, setFilter] = useState<"open" | "all" | "archived">("open");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSave(e?: FormEvent) {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    addIdea(trimmed);
    setText("");
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  }

  const openCount = ideas.filter((i) => i.status === "open").length;
  const filteredIdeas = ideas.filter((idea) => {
    if (filter === "open") return idea.status === "open";
    if (filter === "archived") return idea.status === "archived" || idea.status === "completed";
    return true;
  });

  return (
    <div className="w-full">
      <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
        QUICK IDEA
      </div>

      <div className="card-shadow card-shadow-hover rounded-lg border border-stone-300/70 bg-[#FFFCF7] p-4 sm:p-5">
        {/* Compact capture form */}
        <form onSubmit={handleSave} className="relative">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Capture a thought..."
              className="focus-ring min-h-11 flex-1 rounded-md border border-stone-300 bg-white px-3.5 text-sm text-[#242424] placeholder:text-stone-400"
              aria-label="Capture a thought"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Save idea"
              className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md px-4 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Save
            </button>
          </div>
        </form>

        {/* Action / Feedback row */}
        <div className="mt-3 flex items-center justify-between border-t border-stone-200/70 pt-3">
          <button
            type="button"
            onClick={() => setShowIdeas((prev) => !prev)}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-xs font-medium text-stone-600 hover:text-[var(--primary)]"
            aria-expanded={showIdeas}
          >
            <span>{showIdeas ? "Hide ideas" : "View all ideas"}</span>
            <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
              {openCount}
            </span>
            <ChevronDown
              size={15}
              className={`text-stone-400 transition-transform ${showIdeas ? "rotate-180" : ""}`}
            />
          </button>

          <div
            className={`flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] transition-opacity duration-200 ${
              saved ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-live="polite"
          >
            <Check size={14} />
            <span>Saved</span>
          </div>
        </div>

        {/* Ideas View */}
        {showIdeas && (
          <div className="mt-4 border-t border-stone-200/70 pt-4">
            {/* Filter pills */}
            <div className="mb-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilter("open")}
                className={`focus-ring inline-flex min-h-11 items-center rounded-md px-3 text-xs font-medium transition-colors ${
                  filter === "open"
                    ? "bg-[var(--primary-tint)] text-[var(--primary)] font-semibold"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Open ({openCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("archived")}
                className={`focus-ring inline-flex min-h-11 items-center rounded-md px-3 text-xs font-medium transition-colors ${
                  filter === "archived"
                    ? "bg-[var(--primary-tint)] text-[var(--primary)] font-semibold"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Archived ({ideas.filter((i) => i.status !== "open").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`focus-ring inline-flex min-h-11 items-center rounded-md px-3 text-xs font-medium transition-colors ${
                  filter === "all"
                    ? "bg-[var(--primary-tint)] text-[var(--primary)] font-semibold"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                All ({ideas.length})
              </button>
            </div>

            {/* List of ideas */}
            {filteredIdeas.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                {filter === "open"
                  ? "No open ideas. Capture a thought above."
                  : filter === "archived"
                  ? "No archived ideas."
                  : "No ideas saved yet."}
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredIdeas.map((idea) => (
                  <IdeaItem
                    key={idea.id}
                    idea={idea}
                    onToggleComplete={() => toggleComplete(idea.id)}
                    onToggleArchive={() => toggleArchive(idea.id)}
                    onDelete={() => deleteIdea(idea.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IdeaItem({
  idea,
  onToggleComplete,
  onToggleArchive,
  onDelete,
}: {
  idea: QuickIdea;
  onToggleComplete: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const isDone = idea.status === "completed";
  const isArchived = idea.status === "archived";
  const isInactive = isDone || isArchived;

  return (
    <div className="group card-shadow flex items-start justify-between gap-3 rounded-md border border-stone-200/80 bg-white p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p
          className={`break-words whitespace-pre-wrap leading-relaxed text-sm ${
            isInactive ? "text-stone-400 line-through" : "text-[#242424]"
          }`}
        >
          {idea.text}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-stone-500">
          <span>{formatRelativeTime(idea.createdAt)}</span>
          {isArchived && (
            <span className="rounded bg-stone-100 px-1.5 py-0.2 text-[10px] font-medium text-stone-600">
              Archived
            </span>
          )}
          {isDone && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-700">
              Completed
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* Archive/Complete buttons */}
        <button
          type="button"
          onClick={onToggleComplete}
          aria-label={isDone ? "Mark idea not completed" : "Mark idea completed"}
          title={isDone ? "Reopen" : "Complete"}
          className={`focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md text-stone-400 hover:text-emerald-700 hover:bg-stone-100 ${
            isDone ? "text-emerald-700" : ""
          }`}
        >
          {isDone ? <Undo2 size={16} /> : <Check size={16} />}
        </button>

        <button
          type="button"
          onClick={onToggleArchive}
          aria-label={isArchived ? "Unarchive idea" : "Archive idea"}
          title={isArchived ? "Unarchive" : "Archive"}
          className={`focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 ${
            isArchived ? "text-amber-700" : ""
          }`}
        >
          <Archive size={16} />
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete idea"
          title="Delete"
          className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
