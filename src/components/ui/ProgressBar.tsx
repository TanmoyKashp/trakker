export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200" aria-label={`${percent}% complete`}>
      <div className="h-full rounded-full bg-[#6B1F2A]" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}
