"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { BarChart3, Building2, PlusCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Панель", icon: BarChart3 },
  { href: "/clients", label: "Клиенты", icon: Building2 },
  { href: "/clients/new", label: "Добавить клиента", icon: PlusCircle },
  { href: "/settings", label: "Настройки", icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function isActiveLink(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/clients") {
      return (
        pathname === "/clients" ||
        (pathname.startsWith("/clients/") && pathname !== "/clients/new")
      );
    }
    if (href === "/clients/new") return pathname === "/clients/new";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-[1480px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white/90 px-5 py-7 backdrop-blur">
          <div className="px-3 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Adzek2023
            </p>
            <h1 className="mt-2 text-lg font-semibold text-slate-900">Система продаж</h1>
          </div>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = isActiveLink(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "motion-standard focus-enterprise flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-[#0f766e] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="p-5 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
