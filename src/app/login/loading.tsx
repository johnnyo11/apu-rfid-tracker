export default function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11110f] text-white">
      <div className="text-center" aria-live="polite">
        <span className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-blue-500 font-black text-slate-950">
          AV
        </span>
        <p className="mt-4 text-sm text-slate-300">Preparing secure access…</p>
      </div>
    </main>
  );
}
