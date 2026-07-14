"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CalendarDays, CalendarRange, LogOut, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Agenda", icon: CalendarDays, exact: true },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarRange, exact: false },
  { href: "/admin/employees", label: "Employees", icon: Users, exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
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
      <div className="container flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-ink-muted md:mb-0 md:mr-4 md:inline">
            Admin
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:inline-flex md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
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
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
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
        </div>

        <Button variant="outline" onClick={signOut} className="w-full shrink-0 md:w-auto">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </header>
  );
}
