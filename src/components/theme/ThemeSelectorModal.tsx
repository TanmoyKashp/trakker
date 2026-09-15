import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { THEMES, type ThemeId } from "../../lib/theme";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export function ThemeSelectorModal({ isOpen, onClose, activeTheme, onSelectTheme }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="card-shadow relative w-full max-w-md rounded-xl border border-stone-300/80 bg-[#FFFCF7] p-5 text-[#242424] shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h2 id="theme-modal-title" className="font-serif text-lg font-semibold tracking-wide">
              Choose Theme
            </h2>
            <p className="text-xs text-stone-500">Select your preferred aesthetic atmosphere</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {THEMES.map((t) => {
            const isSelected = activeTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelectTheme(t.id);
                }}
                className={`focus-ring w-full flex items-center justify-between gap-3.5 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary-tint)] ring-1 ring-[var(--primary)]"
                    : "border-stone-200/90 bg-[#F7F3ED]/60 hover:bg-[#F7F3ED] hover:border-stone-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Swatch preview */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-2xs"
                    style={{ backgroundColor: t.preview.bg, borderColor: t.preview.primary }}
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: t.preview.primary }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                      <span>{t.name}</span>
                      {t.id === "auto" && (
                        <span className="text-[10px] uppercase tracking-wider font-normal text-stone-500 px-1.5 py-0.5 rounded bg-stone-200/70">
                          Adaptive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 truncate">{t.description}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-stone-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-md px-4 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
