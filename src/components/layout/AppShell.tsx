import { ClipboardList, GitFork, LineChart } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/applications", label: "Applications", icon: ClipboardList },
  { to: "/tree", label: "Application Tree", icon: GitFork },
  { to: "/status", label: "Status", icon: LineChart },
];

export function AppShell({ offline, error }: { offline: boolean; error?: string }) {
  return (
    <div className="min-h-screen bg-[#F7F3ED] text-[#242424]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-300/70 bg-[#FFFCF7] px-4 py-5 lg:block">
        <Link to="/" className="focus-ring mb-7 block font-serif text-lg font-semibold tracking-[0.18em]">TRAKKER</Link>
        <nav className="space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? "bg-[#6B1F2A] text-white" : "text-stone-700 hover:bg-stone-100"}`}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="pb-20 lg:ml-64 lg:pb-0">
        {(offline || error) && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">Offline · Showing saved data</div>}
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-stone-300/70 bg-[#FFFCF7] lg:hidden">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${isActive ? "text-[#6B1F2A]" : "text-stone-600"}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
