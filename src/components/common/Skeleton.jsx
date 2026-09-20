export function Skeleton({ className = '' }) { return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-800 ${className}`} />; }
export function MetricSkeleton() { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><Skeleton className="h-4 w-24"/><Skeleton className="mt-5 h-9 w-20"/><Skeleton className="mt-3 h-3 w-32"/></div>; }
export function ChartSkeleton() { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><Skeleton className="h-5 w-40"/><Skeleton className="mt-6 h-64 w-full"/></div>; }
