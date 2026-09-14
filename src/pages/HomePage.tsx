import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { findNextAction, nextDeadline } from "../lib/nextAction";
import type { Application, TreeNodeRecord } from "../types";

export function HomePage({ applications, tree }: { applications: Application[]; tree: TreeNodeRecord[] }) {
  const action = findNextAction(applications, tree);
  const closing = nextDeadline(applications);

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-2xl text-center">
        <h1 className="mb-16 font-serif text-5xl font-semibold tracking-[0.18em] text-[#242424] sm:text-7xl">TRAKKER</h1>
        <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Your next thing to do</p>
        <div className="mx-auto max-w-xl">
          <h2 className="text-balance text-3xl font-semibold leading-tight text-[#242424] sm:text-4xl">{action.title}</h2>
          {action.context && <p className="mt-4 text-base text-stone-600">{action.context}</p>}
          {action.urgency && <p className="mt-3 text-sm font-medium text-[#6B1F2A]">{action.urgency}</p>}
          {action.href && (
            <Link className="focus-ring mt-8 inline-flex items-center gap-2 rounded-md bg-[#6B1F2A] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#591923]" to={action.href}>
              Do it <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {closing && (
          <div className="mx-auto mt-12 max-w-xl border-t border-stone-300 pt-6 text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Next deadline</div>
            <Link className="focus-ring mt-2 block rounded-md py-1 text-sm text-[#242424] hover:text-[#6B1F2A]" to={`/applications/${closing.app.id}`}>
              <span className="font-medium">{closing.app.opportunity}</span>
              <span className="text-stone-500"> · {closing.deadline.label}</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
