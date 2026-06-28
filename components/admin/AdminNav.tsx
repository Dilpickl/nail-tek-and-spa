"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CalendarDays, LogOut, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Agenda", icon: CalendarDays, exact: true },
  { href: "/admin/employees", label: "Employees", icon: Users, exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return null;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink/10 bg-offwhite">
      <div className="container flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-4 text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Admin
          </p>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                  active
                    ? "bg-ink text-offwhite"
                    : "bg-secondary text-ink hover:bg-accent"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <Button variant="outline" onClick={signOut} className="w-full sm:w-auto">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </header>
  );
}
