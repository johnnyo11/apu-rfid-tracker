"use client";

import { useEffect } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

const styles: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

const icons: Record<ToastTone, string> = {
  success: "✓",
  error: "!",
  warning: "!",
  info: "i",
};

const labels: Record<ToastTone, string> = {
  success: "Success",
  error: "Action unsuccessful",
  warning: "Attention",
  info: "In progress",
};

export default function StatusToast({
  message,
  tone,
  onDismiss,
  duration = 6000,
}: {
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (duration <= 0) return;
    const timeout = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, message, onDismiss]);

  return (
    <div
      className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-end sm:inset-x-auto sm:right-5 sm:w-full sm:max-w-sm"
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <div
        role={tone === "error" ? "alert" : "status"}
        className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg ${styles[tone]}`}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-sm font-black"
          aria-hidden="true"
        >
          {icons[tone]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{labels[tone]}</p>
          <p className="mt-0.5 text-sm leading-5 opacity-90">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 -mt-1 rounded p-1 text-lg leading-none opacity-60 hover:bg-black/5 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
