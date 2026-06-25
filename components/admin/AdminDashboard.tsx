"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Loader2,
  LogOut,
  Phone,
  Plus,
  ToggleLeft,
  ToggleRight,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { technicians } from "@/lib/config/salonData";
import { createClient } from "@/lib/supabase/client";

export interface AdminAppointment {
  id: string;
  technicianId: string | null;
  customerName: string;
  customerPhone: string;
  startsAt: string;
  endsAt: string;
  source: "online" | "walk_in" | "phone";
  services: string[];
  notes: string | null;
}

interface AdminDashboardProps {
  today: string;
  appointments: AdminAppointment[];
  offTechnicianIds: string[];
}

type QuickSource = "walk_in" | "phone";

export function AdminDashboard({
  today,
  appointments,
  offTechnicianIds,
}: AdminDashboardProps) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [quickSource, setQuickSource] = useState<QuickSource | null>(null);
  const [pendingOffId, setPendingOffId] = useState("");
  const [offIds, setOffIds] = useState(new Set(offTechnicianIds));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-new-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        () => {
          setNotice("New online booking received. Refresh to update the agenda.");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const appointmentsByTech = useMemo(() => {
    const map = new Map<string, AdminAppointment[]>();
    technicians.forEach((technician) => map.set(technician.id, []));

    appointments.forEach((appointment) => {
      if (!appointment.technicianId) return;
      map.get(appointment.technicianId)?.push(appointment);
    });

    return map;
  }, [appointments]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  async function toggleOff(technicianId: string) {
    const nextOff = !offIds.has(technicianId);
    setPendingOffId(technicianId);

    try {
      const response = await fetch("/api/admin/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId, date: today, off: nextOff }),
      });

      if (!response.ok) throw new Error("Unable to update technician status.");

      setOffIds((current) => {
        const next = new Set(current);
        if (nextOff) next.add(technicianId);
        else next.delete(technicianId);
        return next;
      });
      router.refresh();
    } finally {
      setPendingOffId("");
    }
  }

  return (
    <div className="container py-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-ink">Today&apos;s Agenda</h1>
          <p className="mt-1 text-ink-muted">{formatReadableDate(today)}</p>
        </div>

        <Button variant="outline" onClick={signOut}>
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>

      {notice && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-ink px-5 py-4 text-offwhite">
          <span className="flex items-center gap-2">
            <Bell className="size-5" />
            {notice}
          </span>
          <Button variant="secondary" onClick={() => router.refresh()}>
            Refresh
          </Button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setQuickSource("walk_in")}
          className="flex min-h-28 items-center gap-5 rounded-2xl bg-ink p-6 text-left text-offwhite shadow-sm"
        >
          <span className="flex size-14 items-center justify-center rounded-xl bg-offwhite/10">
            <UserPlus className="size-7" />
          </span>
          <span>
            <span className="block text-2xl font-semibold">Add Walk-In</span>
            <span className="mt-1 block text-sm text-offwhite/70">
              Quickly block a chair for someone at the salon.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQuickSource("phone")}
          className="flex min-h-28 items-center gap-5 rounded-2xl bg-offwhite p-6 text-left text-ink shadow-sm ring-1 ring-ink/5"
        >
          <span className="flex size-14 items-center justify-center rounded-xl bg-secondary">
            <Phone className="size-7" />
          </span>
          <span>
            <span className="block text-2xl font-semibold">Add Phone Booking</span>
            <span className="mt-1 block text-sm text-ink-muted">
              Create a manual appointment from a call.
            </span>
          </span>
        </button>
      </div>

      {quickSource && (
        <QuickBookingPanel
          source={quickSource}
          today={today}
          onClose={() => setQuickSource(null)}
        />
      )}

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {technicians.map((technician) => {
          const items = appointmentsByTech.get(technician.id) ?? [];
          const isOff = offIds.has(technician.id);

          return (
            <section
              key={technician.id}
              className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">{technician.name}</h2>
                  <p className="text-sm text-ink-muted">{technician.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleOff(technician.id)}
                  disabled={pendingOffId === technician.id}
                  className={`flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
                    isOff ? "bg-red-50 text-red-700" : "bg-secondary text-ink"
                  }`}
                >
                  {pendingOffId === technician.id ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : isOff ? (
                    <ToggleRight className="size-5" />
                  ) : (
                    <ToggleLeft className="size-5" />
                  )}
                  {isOff ? "Off / Sick" : "Working"}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {isOff && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    Marked off for today. This technician will not show online
                    availability.
                  </p>
                )}

                {items.length === 0 && !isOff && (
                  <p className="rounded-xl bg-background px-4 py-6 text-center text-ink-muted">
                    No appointments yet.
                  </p>
                )}

                {items.map((appointment) => (
                  <article
                    key={appointment.id}
                    className="rounded-xl bg-background p-4 ring-1 ring-ink/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-ink">
                          {appointment.customerName}
                        </p>
                        <p className="text-sm text-ink-muted">
                          {appointment.customerPhone}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                        {sourceLabel(appointment.source)}
                      </span>
                    </div>

                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
                      <CalendarDays className="size-4" />
                      {formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}
                    </p>

                    {appointment.services.length > 0 && (
                      <p className="mt-2 text-sm text-ink-muted">
                        {appointment.services.join(", ")}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function QuickBookingPanel({
  source,
  today,
  onClose,
}: {
  source: QuickSource;
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id ?? "");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [name, setName] = useState(source === "walk_in" ? "Walk-In Guest" : "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/quick-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          technicianId,
          date: today,
          time,
          durationMinutes: Number(duration),
          customerName: name,
          customerPhone: phone || "N/A",
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(body.error || "Unable to create booking.");

      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-ink">
          {source === "walk_in" ? "Add Walk-In" : "Add Phone Booking"}
        </h2>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="text-sm font-medium text-ink">Technician</span>
          <select
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-ink"
          >
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Start Time</span>
          <input
            type="time"
            step="900"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-ink"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Duration</span>
          <select
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-ink"
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="75">75 min</option>
            <option value="90">90 min</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-ink"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-ink"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button className="mt-5 min-h-14 w-full sm:w-auto" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Block This Time
      </Button>
    </div>
  );
}

function sourceLabel(source: AdminAppointment["source"]) {
  if (source === "walk_in") return "Walk-In";
  if (source === "phone") return "Phone";
  return "Online";
}

function formatReadableDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
