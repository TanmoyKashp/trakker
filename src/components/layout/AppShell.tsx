import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  GitFork,
  House,
  LineChart,
  ListTodo,
  Target,
  User,
  Users,
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import type { Mode } from "../../types";

const sharedNav = [
  { to: "/applications", label: "Applications", icon: ClipboardList },
  { to: "/tree", label: "Application Tree", icon: GitFork },
  { to: "/status", label: "Status", icon: LineChart },
];

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
  { to: "/meetings", label: "Meetings", icon: Users },
];

const homeNav = { to: "/", label: "Home", icon: House };

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-stone-300 bg-[#FFFCF7] p-0.5 shadow-sm" role="group" aria-label="Mode">
      <button
        type="button"
        aria-pressed={mode === "work"}
        onClick={() => onChange("work")}
        className={`focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium ${
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
        className={`focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium ${
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
    // Active route: primary-colored text on a subtle tinted surface with a small
    // left indicator — always clearly visible on the cream sidebar background.
    return "focus-ring relative flex items-center gap-3 rounded-md bg-[var(--primary-tint)] px-3 py-2 text-sm font-medium text-[var(--primary)]";
  }
  return "focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-100";
}

function ActiveIndicator() {
  return <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--primary)]" />;
}

export function AppShell({
  offline,
  error,
  mode,
  onModeChange,
}: {
  offline: boolean;
  error?: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}) {
  const modeNav = mode === "work" ? workNav : personalNav;

  return (
    <div className="app-root min-h-screen bg-[#F7F3ED] text-[#242424]" data-theme={mode}>
      {/* Mobile top bar: brand + the single mode switch */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-300/70 bg-[#F7F3ED]/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link to="/" className="focus-ring font-serif text-base font-semibold tracking-[0.18em]">
          TRAKKER
        </Link>
        <ModeSwitch mode={mode} onChange={onModeChange} />
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-300/70 bg-[#FFFCF7] px-4 py-5 lg:flex">
        <Link to="/" className="focus-ring mb-5 block font-serif text-lg font-semibold tracking-[0.18em]">
          TRAKKER
        </Link>
        <ModeSwitch mode={mode} onChange={onModeChange} />
        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
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
          <NavLinks items={modeNav} />
          <div className="my-3 border-t border-stone-200" />
          <NavLinks items={sharedNav} />
        </nav>
      </aside>

      <main className="pb-24 lg:ml-64 lg:pb-0">
        {(offline || error) && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">Offline · Showing saved data</div>
        )}
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-stone-300/70 bg-[#FFFCF7] lg:hidden">
        <NavLink
          end
          to="/"
          className={({ isActive }) =>
            `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${isActive ? "text-[var(--primary)]" : "text-stone-600"}`
          }
        >
          <House size={18} />
          Home
        </NavLink>
        {modeNav.slice(0, 3).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                isActive ? "text-[var(--primary)]" : "text-stone-600"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function NavLinks({ items }: { items: typeof sharedNav }) {
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
