"use client";

export default function LocationsError({ error, reset }: { error: Error; reset: () => void }) {
  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-900"><h1 className="text-xl font-bold">Unable to load locations</h1><p className="mt-2 text-sm">{error.message}</p><button type="button" onClick={reset} className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Try again</button></div></main>;
}
