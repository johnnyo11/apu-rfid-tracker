export default function ActivityLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl" aria-live="polite">
        <div className="h-9 w-52 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl bg-white"
            />
          ))}
        </div>
        <span className="sr-only">Loading movement history...</span>
      </div>
    </main>
  );
}
