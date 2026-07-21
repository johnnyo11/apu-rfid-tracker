"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import UserMenu from "@/components/UserMenu";

const items = [
  { href: "/", label: "Dashboard", icon: "home", mobile: true },
  { href: "/equipment", label: "Equipment", icon: "equipment", mobile: true },
  { href: "/events", label: "Events", icon: "events", mobile: true },
  { href: "/locations", label: "Locations", icon: "location", mobile: true },
  { href: "/operations", label: "Operations", icon: "operations", mobile: true },
  { href: "/part_timer", label: "Part-timers", icon: "users", mobile: false },
] as const;

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    equipment: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5V3h8v2M8 12h8M12 9v6"/></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 4.5a3 3 0 0 1 0 6M17 14.5a5.5 5.5 0 0 1 3.5 5.5"/></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M13 14h3M8 17h3"/></>,
    operations: <><path d="M4 7h16M7 3v8M4 17h16M17 13v8"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="7" r="2"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{paths[name]}</svg>;
}

export default function AppNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  const active = (href: string) => href === "/" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(href);

  const navLink = (item: (typeof items)[number], mobile = false) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={mobile ? `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition ${active(item.href) ? "bg-blue-500 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}` : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active(item.href) ? "bg-blue-500 text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><NavIcon name={item.icon} /><span className="truncate">{item.label}</span></Link>;

  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-[#11110f] p-4 md:flex"><Link href="/" className="flex items-center gap-3 px-2 py-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-sm font-bold text-slate-950">AV</span><span><span className="block font-bold text-white">APU AV Inventory</span><span className="block text-xs text-slate-400">RFID Management</span></span></Link><nav aria-label="Main navigation" className="mt-7 space-y-1">{items.map((item) => navLink(item))}</nav><div className="mt-auto rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-400">Track equipment, locations, and team responsibility from one place.</div></aside>
    <div className="min-h-screen md:pl-64"><header className="sticky top-0 z-20 hidden h-16 items-center justify-end border-b border-slate-200 bg-white/95 px-6 backdrop-blur md:flex"><UserMenu /></header><header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-[#11110f]/95 px-4 backdrop-blur md:hidden"><Link href="/" className="flex items-center gap-2 font-bold text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-xs text-slate-950">AV</span>APU AV Inventory</Link><UserMenu compact /></header><div className="pb-24 md:pb-0">{children}</div></div>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-[#11110f]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden">{items.filter((item) => item.mobile).map((item) => navLink(item, true))}</nav>
  </div>;
}
