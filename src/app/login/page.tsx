"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import StatusToast, { type ToastTone } from "@/components/StatusToast";

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState<{
    type: ToastTone;
    text: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase is not configured." });
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setIsSigningIn(true);
    setMessage({
      type: "info",
      text: "Checking your email and password securely…",
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsSigningIn(false);

    if (error) {
      setMessage({
        type: "error",
        text:
          error.message === "Invalid login credentials"
            ? "The email or password is incorrect. Check both fields and try again."
            : error.message,
      });
      return;
    }
    if (!data.session) {
      setMessage({
        type: "error",
        text: "The password was accepted, but no login session was created. Check that the account email is confirmed.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Password accepted. Opening your dashboard…",
    });
    const requestedPath = new URLSearchParams(window.location.search).get(
      "next",
    );
    const destination =
      requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/";
    window.setTimeout(() => {
      window.location.replace(destination);
    }, 700);
  }

  return (
    <main className="grid min-h-screen bg-[#11110f] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-20"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #c49a35 0, transparent 28%), radial-gradient(circle at 80% 75%, #c49a35 0, transparent 24%)",
          }}
        />
        <div className="relative">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 font-black text-slate-950">
            AV
          </span>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">
            APU Audio Visual Team
          </p>
        </div>
        <div className="relative max-w-xl">
          <h2 className="text-4xl font-bold leading-tight">
            Know what went out, where it went, and when it returned.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
            RFID-assisted inventory, event deployment, movement history, and
            equipment lifecycle monitoring in one workspace.
          </p>
        </div>
        <p className="relative text-sm text-slate-500">
          Authorised AV personnel only
        </p>
      </section>

      <section className="flex min-h-screen items-center bg-[#f7f5ef] px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 font-black text-slate-950">
              AV
            </span>
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-blue-600 lg:mt-0">
            Secure access
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-slate-600">
            Sign in with the account provided by your AV administrator.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="name@apu.edu.my"
              className="mt-2 block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              minLength={8}
              placeholder="Enter your password"
              className="mt-2 block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <button
            type="submit"
            disabled={isSigningIn}
            className="min-h-12 w-full rounded-lg bg-[#11110f] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? "Signing in..." : "Sign in"}
          </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Contact the admin or quartermaster if you need an account or cannot
            access the system.
          </p>
        </div>
      </section>
      {message && (
        <StatusToast
          message={message.text}
          tone={message.type}
          duration={message.type === "info" ? 0 : 6000}
          onDismiss={() => setMessage(null)}
        />
      )}
    </main>
  );
}
