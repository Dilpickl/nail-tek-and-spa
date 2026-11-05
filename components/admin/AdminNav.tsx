"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CalendarDays, CalendarRange, LogOut, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  href: string;
  label: string;
  /** Shown on phones, where five tabs share one row. */
  shortLabel?: string;
  icon: typeof CalendarDays;
  exact: boolean;
}[] = [
  { href: "/admin", label: "Agenda", icon: CalendarDays, exact: true },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarRange, exact: false },
  { href: "/admin/employees", label: "Employees", shortLabel: "Team", icon: Users, exact: false },
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
      <div className="container py-3 md:flex md:items-center md:justify-between md:gap-4 md:py-4">
        <div className="flex items-center justify-between gap-3 md:contents">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted md:hidden">
            Admin
          </p>
          <Button
            variant="outline"
            onClick={signOut}
            className="h-10 shrink-0 px-3 md:order-last md:h-11 md:px-4"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>

        <nav
          aria-label="Admin"
          className="mt-3 grid grid-cols-5 gap-1.5 md:mt-0 md:flex md:min-w-0 md:flex-1 md:flex-wrap md:items-center md:gap-2"
        >
          <p className="hidden text-xs font-medium uppercase tracking-[0.2em] text-ink-muted lg:mr-2 lg:block">
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold leading-tight transition-colors",
                  "md:min-h-11 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm",
                  active
                    ? "bg-ink text-offwhite"
                    : "bg-secondary text-ink hover:bg-accent"
                )}
              >
                <Icon className="size-5 shrink-0 md:size-4" />
                {item.shortLabel ? (
                  <>
                    <span className="max-w-full truncate md:hidden">{item.shortLabel}</span>
                    <span className="hidden md:inline">{item.label}</span>
                  </>
                ) : (
                  <span className="max-w-full truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
