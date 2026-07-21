"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AccountSummary = {
  name: string;
  email: string;
  role: string;
};

export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<AccountSummary>({
    name: "AV team member",
    email: "",
    role: "Authenticated user",
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;

      const profileFields = "name, email, role";
      const { data: linkedProfile } = await supabase
        .from("part_timer")
        .select(profileFields)
        .eq("auth_user_id", user.id)
        .maybeSingle();

      let profile = linkedProfile;
      if (!profile && user.email) {
        const { data: emailProfile } = await supabase
          .from("part_timer")
          .select(profileFields)
          .ilike("email", user.email)
          .maybeSingle();
        profile = emailProfile;
      }

      if (!active) return;
      const email = profile?.email ?? user.email ?? "";
      const metadataName =
        typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name.trim()
          : "";
      setAccount({
        name:
          profile?.name ||
          metadataName ||
          "AV team member",
        email,
        role: profile?.role ?? "AV team member",
      });
    }

    void loadAccount();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function closeWhenOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const initials =
    account.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AV";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={compact ? "Open account menu" : undefined}
        className={`flex items-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          compact
            ? "p-1 hover:bg-white/10"
            : "gap-3 border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-slate-950">
          {initials}
        </span>
        {!compact && (
          <>
            <span className="min-w-0">
              <span className="block max-w-40 truncate text-sm font-semibold text-slate-900">
                {account.name}
              </span>
              <span className="block max-w-40 truncate text-xs capitalize text-slate-500">
                {account.role.replaceAll("_", " ")}
              </span>
            </span>
            <span className="px-1 text-xs text-slate-400" aria-hidden="true">
              ▾
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-bold text-slate-900">
              {account.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {account.email || "Authenticated AV account"}
            </p>
          </div>
          <div className="p-2">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Profile &amp; settings
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <form
            action="/auth/signout"
            method="post"
            className="border-t border-slate-100 p-2"
          >
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
