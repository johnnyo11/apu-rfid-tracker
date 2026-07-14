export default function LocationsLoading() {
  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl" aria-live="polite"><div className="h-8 w-48 animate-pulse rounded bg-slate-200" /><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-xl bg-white" />)}</div><span className="sr-only">Loading locations...</span></div></main>;
}
