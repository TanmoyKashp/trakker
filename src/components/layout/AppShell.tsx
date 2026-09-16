import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  GitFork,
  GraduationCap,
  House,
  LineChart,
  ListTodo,
  LogOut,
  Palette,
  Target,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { isOwnerUser } from "../../lib/owner";
import { applyThemeToDom, THEMES, useTheme, type ThemeId } from "../../lib/theme";
import { DottedRabbit } from "../rabbit/DottedRabbit";
import { ThemeSelectorModal } from "../theme/ThemeSelectorModal";
import type { Mode } from "../../types";

const workNav = [
  { to: "/today", label: "Today", icon: CalendarDays },
  { to: "/timetable", label: "Timetable", icon: ListTodo },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/meetings", label: "Meetings", icon: Users },
];

const personalNav = [
  { to: "/daily", label: "Daily", icon: House },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
];

const phdNav = [
  { to: "/applications", label: "Applications", icon: GraduationCap },
  { to: "/tree", label: "Application Tree", icon: GitFork },
  { to: "/status", label: "PhD Status", icon: LineChart },
];

const homeNav = { to: "/", label: "Home", icon: House };

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-stone-300 bg-[#FFFCF7] p-0.5 shadow-xs" role="group" aria-label="Mode">
      <button
        type="button"
        aria-pressed={mode === "work"}
        onClick={() => onChange("work")}
        className={`focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium transition-colors cursor-pointer ${
          mode === "work" ? "text-white" : "text-stone-600 hover:bg-stone-100"
        }`}
        style={mode === "work" ? { backgroundColor: "var(--primary)" } : undefined}
      >
        <Briefcase size={15} />
        <span className="hidden sm:inline">Work</span>
      </button>
      <button
        type="button"
        aria-pressed={mode === "personal"}
        onClick={() => onChange("personal")}
        className={`focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium transition-colors cursor-pointer ${
          mode === "personal" ? "text-white" : "text-stone-600 hover:bg-stone-100"
        }`}
        style={mode === "personal" ? { backgroundColor: "var(--primary)" } : undefined}
      >
        <User size={15} />
        <span className="hidden sm:inline">Personal</span>
      </button>
    </div>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return "focus-ring relative flex items-center gap-3 rounded-md bg-[var(--primary-tint)] px-3 py-2 text-sm font-medium text-[var(--primary)]";
  }
  return "focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 transition-colors";
}

function ActiveIndicator() {
  return <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--primary)]" />;
}

export function AppShell({
  offline,
  error,
  mode,
  onModeChange,
  initialTheme,
  onThemePersist,
}: {
  offline: boolean;
  error?: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  initialTheme?: string;
  onThemePersist?: (theme: string) => void;
}) {
  const { user, signOut, isOfflineMode } = useAuth();
  const isOwner = isOwnerUser(user);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const { theme, setTheme } = useTheme(initialTheme as ThemeId | undefined, (t) => onThemePersist?.(t));

  // Keep DOM theme attribute and status bar meta updated
  useEffect(() => {
    applyThemeToDom(theme, mode);
  }, [theme, mode]);

  const currentThemeDef = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="app-root min-h-screen bg-[#F7F3ED] text-[#242424]" data-theme={mode} data-palette={theme}>
      {/* Mobile top bar: brand with dotted rabbit + mode switch + theme + sign out */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-300/70 bg-[#F7F3ED]/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <Link to="/" className="focus-ring flex items-center gap-2 font-serif text-base font-semibold tracking-[0.18em]">
          <DottedRabbit size="sm" />
          <span>TRAKKER</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ModeSwitch mode={mode} onChange={onModeChange} />
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            aria-label="Choose Theme"
            title="Choose Theme"
            className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-[#FFFCF7] text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <Palette size={16} />
          </button>
          {user ? (
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title={`Sign out (${user.email || ""})`}
              className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-[#FFFCF7] text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          ) : isOfflineMode ? (
            <button
              type="button"
              onClick={signOut}
              aria-label="Exit offline mode"
              title="Exit offline mode"
              className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-stone-300 bg-[#FFFCF7] text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          ) : null}
        </div>
      </header>

      {/* Desktop Sidebar: brand with dotted rabbit, mode-isolated navigation, settings */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-300/70 bg-[#FFFCF7] px-4 py-5 lg:flex">
        <Link to="/" className="focus-ring mb-5 flex items-center gap-2.5 font-serif text-lg font-semibold tracking-[0.18em]">
          <DottedRabbit size="sm" />
          <span>TRAKKER</span>
        </Link>
        <ModeSwitch mode={mode} onChange={onModeChange} />

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
          <NavLink end to={homeNav.to} className={navLinkClass}>
            {({ isActive }: { isActive: boolean }) => (
              <>
                <homeNav.icon size={17} />
                {homeNav.label}
                {isActive && <ActiveIndicator />}
              </>
            )}
          </NavLink>
          <div className="my-3 border-t border-stone-200" />

          {/* Strict Work vs Personal Mode Navigation */}
          {mode === "work" ? (
            <NavLinks items={workNav} />
          ) : (
            <>
              <NavLinks items={personalNav} />
              {isOwner && (
                <>
                  <div className="my-3 border-t border-stone-200" />
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                    PhD Tracking
                  </div>
                  <NavLinks items={phdNav} />
                </>
              )}
            </>
          )}
        </nav>

        {/* Settings & User Account Section */}
        <div className="mt-auto border-t border-stone-200 pt-3 space-y-2">
          {/* Choose Theme Button */}
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="focus-ring flex w-full items-center justify-between rounded-lg border border-stone-200/80 bg-[#F7F3ED]/60 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Palette size={14} className="text-stone-500" />
              <span className="font-medium">Theme</span>
            </span>
            <span className="text-[11px] text-stone-500 capitalize bg-[#FFFCF7] px-1.5 py-0.5 rounded border border-stone-200">
              {currentThemeDef.name}
            </span>
          </button>

          {user ? (
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-stone-800">
                  {user.displayName || "User"}
                </div>
                <div className="truncate text-[11px] text-stone-500">
                  {user.email || ""}
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
                className="focus-ring flex min-h-9 min-w-9 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : isOfflineMode ? (
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-stone-700">
                  Offline Mode
                </div>
                <div className="truncate text-[11px] text-stone-400">
                  Local data only
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                aria-label="Exit offline mode"
                title="Exit offline mode"
                className="focus-ring flex min-h-9 min-w-9 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="safe-bottom lg:ml-64">
        {(offline || error) && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Offline · Showing saved data
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile bottom nav: strictly isolated by mode */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-stone-300/70 bg-[#FFFCF7] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <NavLink
          end
          to="/"
          className={({ isActive }) =>
            `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
              isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
            }`
          }
        >
          <House size={18} />
          Home
        </NavLink>

        {mode === "work" ? (
          <>
            <NavLink
              to="/today"
              className={({ isActive }) =>
                `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
                }`
              }
            >
              <CalendarDays size={18} />
              Today
            </NavLink>
            <NavLink
              to="/timetable"
              className={({ isActive }) =>
                `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
                }`
              }
            >
              <ListTodo size={18} />
              Timetable
            </NavLink>
            <NavLink
              to="/tasks"
              className={({ isActive }) =>
                `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
                }`
              }
            >
              <ClipboardList size={18} />
              Tasks
            </NavLink>
          </>
        ) : (
          <>
            <NavLink
              to="/daily"
              className={({ isActive }) =>
                `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
                }`
              }
            >
              <House size={18} />
              Daily
            </NavLink>
            <NavLink
              to="/goals"
              className={({ isActive }) =>
                `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
                }`
              }
            >
              <Target size={18} />
              Goals
            </NavLink>
            {isOwner ? (
              <NavLink
                to="/applications"
                className={({ isActive }) =>
                  `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                    isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
                  }`
                }
              >
                <GraduationCap size={18} />
                PhD Apps
              </NavLink>
            ) : (
              <NavLink
                to="/workout"
                className={({ isActive }) =>
                  `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                    isActive ? "text-[var(--primary)] font-medium" : "text-stone-600"
                  }`
                }
              >
                <Dumbbell size={18} />
                Workout
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* Theme Selection Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        activeTheme={theme}
        onSelectTheme={setTheme}
      />
    </div>
  );
}

function NavLinks({ items }: { items: { to: string; label: string; icon: React.ComponentType<{ size?: number }> }[] }) {
  return (
    <>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={navLinkClass}>
          {({ isActive }: { isActive: boolean }) => (
            <>
              <Icon size={17} />
              {label}
              {isActive && <ActiveIndicator />}
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}
