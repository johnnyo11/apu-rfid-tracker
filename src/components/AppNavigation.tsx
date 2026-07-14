"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const items = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/equipment", label: "Equipment", icon: "equipment" },
  { href: "/locations", label: "Locations", icon: "location" },
  { href: "/part_timer", label: "Part-timers", icon: "users" },
  { href: "/events", label: "Events", icon: "events" },
] as const;

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    equipment: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5V3h8v2M8 12h8M12 9v6"/></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 4.5a3 3 0 0 1 0 6M17 14.5a5.5 5.5 0 0 1 3.5 5.5"/></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M13 14h3M8 17h3"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{paths[name]}</svg>;
}

export default function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => href === "/" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(href);

  const navLink = (item: (typeof items)[number], mobile = false) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={mobile ? `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition ${active(item.href) ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}` : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active(item.href) ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><NavIcon name={item.icon} /><span className="truncate">{item.label}</span></Link>;

  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 md:flex"><Link href="/" className="flex items-center gap-3 px-2 py-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">AV</span><span><span className="block font-bold text-slate-900">APU AV Inventory</span><span className="block text-xs text-slate-500">RFID Management</span></span></Link><nav aria-label="Main navigation" className="mt-7 space-y-1">{items.map((item) => navLink(item))}</nav><div className="mt-auto rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Track equipment, locations, and team responsibility from one place.</div></aside>
    <div className="min-h-screen md:pl-64"><header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden"><Link href="/" className="flex items-center gap-2 font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs text-white">AV</span>APU AV Inventory</Link></header><div className="pb-24 md:pb-0">{children}</div></div>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden">{items.map((item) => navLink(item, true))}</nav>
  </div>;
}
