"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, LogOut, PlusCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Панель", icon: BarChart3 },
  { href: "/clients", label: "Клиенты", icon: Building2 },
  { href: "/clients/new", label: "Добавить клиента", icon: PlusCircle },
  { href: "/settings", label: "Настройки", icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userEmail, setUserEmail] = useState<string>("");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (!supabase) {
      setUserEmail("");
      return;
    }

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserEmail(data.user?.email ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserEmail(session?.user?.email ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

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

  async function handleLogout() {
    if (!supabase) {
      window.location.href = "/login";
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto flex min-h-screen w-full max-w-[1480px] items-center justify-center p-5 md:p-8 lg:p-10">
          {children}
        </main>
      </div>
    );
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
            {userEmail ? (
              <p className="mt-2 text-xs text-slate-500">{userEmail}</p>
            ) : null}
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
          <div className="mt-6 px-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>
        </aside>
        <main className="p-5 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
