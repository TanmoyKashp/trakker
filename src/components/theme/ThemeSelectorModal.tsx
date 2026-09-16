import { Check, Moon, Sun, X } from "lucide-react";
import { useEffect } from "react";
import { THEMES, type ThemeId } from "../../lib/theme";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  darkSide?: boolean;
  onToggleDarkSide?: (enabled: boolean) => void;
}

export function ThemeSelectorModal({
  isOpen,
  onClose,
  activeTheme,
  onSelectTheme,
  darkSide = false,
  onToggleDarkSide,
}: Props) {
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

  const selectableThemes = THEMES.filter((t) => t.id !== "dark-side");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="card-shadow relative w-full max-w-md rounded-xl border border-stone-300/80 bg-[#FFFCF7] p-5 text-[#242424] shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h2 id="theme-modal-title" className="font-serif text-lg font-semibold tracking-wide">
              Appearance & Theme
            </h2>
            <p className="text-xs text-stone-500">
              {darkSide ? "A's Dark Side (Active) · Select your accent" : "Select your atmosphere and palette"}
            </p>
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

        {/* Dedicated "A's Dark Side" Mode Card & Switch */}
        <div className="mt-4 mb-3 rounded-lg border border-stone-300/80 bg-[#F7F3ED]/80 p-3.5 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                darkSide ? "bg-[#161618] text-[#f0a8b4]" : "bg-stone-200 text-stone-700"
              }`}
            >
              {darkSide ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold flex items-center gap-2">
                <span>A's Dark Side</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[var(--primary-tint)] text-[var(--primary)]">
                  Night Mode
                </span>
              </div>
              <div className="text-xs text-stone-500 truncate">
                Deep charcoal background with your chosen accent alive
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={darkSide}
            onClick={() => onToggleDarkSide?.(!darkSide)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
              darkSide ? "bg-[var(--primary)]" : "bg-stone-300"
            }`}
            aria-label="Toggle A's Dark Side"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                darkSide ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          Accent Palette
        </div>

        {/* Theme Accents List */}
        <div className="mt-1 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {selectableThemes.map((t) => {
            const isSelected = activeTheme === t.id;
            const preview = darkSide ? t.darkPreview : t.preview;

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
                    style={{ backgroundColor: preview.bg, borderColor: preview.primary }}
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: preview.primary }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>{t.name}</span>
                      {darkSide && (
                        <span className="text-[10px] font-normal text-stone-400">
                          + A's Dark Side
                        </span>
                      )}
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
