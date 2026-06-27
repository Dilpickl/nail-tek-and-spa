"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Loader2,
  Phone,
  Plus,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Users,
} from "lucide-react";

import { AppointmentCard } from "@/components/admin/AppointmentCard";
import { Button } from "@/components/ui/button";
import { TimeWheelPicker } from "@/components/ui/TimeWheelPicker";
import { ANY_EMPLOYEE_ID, ANY_EMPLOYEE_LABEL } from "@/lib/admin/constants";
import { formatReadableDate } from "@/lib/admin/format";
import {
  clampTime,
  getBusinessTimeBounds,
  getNextTimeSlot,
  maxTime,
} from "@/lib/booking/time-utils";
import { technicians } from "@/lib/config/salonData";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface AdminAppointment {
  id: string;
  technicianId: string | null;
  anyTechnician: boolean;
  customerName: string;
  customerPhone: string;
  startsAt: string;
  endsAt: string;
  status: "booked" | "completed" | "cancelled" | "no_show";
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

interface AgendaColumn {
  id: string;
  name: string;
  subtitle?: string;
  showOffToggle?: boolean;
}

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState("");

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

  const columns: AgendaColumn[] = useMemo(
    () => [
      {
        id: ANY_EMPLOYEE_ID,
        name: ANY_EMPLOYEE_LABEL,
        subtitle: "Unassigned — drag here or assign later",
      },
      ...technicians.map((technician) => ({
        id: technician.id,
        name: technician.name,
        subtitle: technician.role,
        showOffToggle: true,
      })),
    ],
    []
  );

  const appointmentsByColumn = useMemo(() => {
    const map = new Map<string, AdminAppointment[]>();
    columns.forEach((column) => map.set(column.id, []));

    appointments.forEach((appointment) => {
      const columnId =
        appointment.anyTechnician || !appointment.technicianId
          ? ANY_EMPLOYEE_ID
          : appointment.technicianId;

      map.get(columnId)?.push(appointment);
    });

    return map;
  }, [appointments, columns]);

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

  async function assignAppointment(appointmentId: string, targetColumnId: string) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment || appointment.status !== "booked") return;

    const currentColumnId =
      appointment.anyTechnician || !appointment.technicianId
        ? ANY_EMPLOYEE_ID
        : appointment.technicianId;

    if (currentColumnId === targetColumnId) return;

    setAssigningId(appointmentId);
    setAssignError("");

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId:
            targetColumnId === ANY_EMPLOYEE_ID ? ANY_EMPLOYEE_ID : targetColumnId,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Unable to move appointment.");
      }

      router.refresh();
    } catch (error) {
      setAssignError((error as Error).message);
    } finally {
      setAssigningId(null);
      setDraggingId(null);
      setDropTargetId(null);
    }
  }

  function handleDrop(event: React.DragEvent, targetColumnId: string) {
    event.preventDefault();
    const appointmentId = event.dataTransfer.getData("text/appointment-id");
    if (!appointmentId) return;
    void assignAppointment(appointmentId, targetColumnId);
  }

  return (
    <div className="container py-8 md:py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Admin Dashboard
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">Today&apos;s Agenda</h1>
        <p className="mt-1 text-ink-muted">{formatReadableDate(today)}</p>
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
          onClick={() =>
            setQuickSource((current) => (current === "walk_in" ? null : "walk_in"))
          }
          className={cn(
            "flex min-h-28 items-center gap-5 rounded-2xl p-6 text-left shadow-sm transition-colors",
            quickSource === "walk_in"
              ? "bg-ink text-offwhite"
              : "bg-offwhite text-ink ring-1 ring-ink/5"
          )}
        >
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-xl",
              quickSource === "walk_in" ? "bg-offwhite/10" : "bg-secondary"
            )}
          >
            <UserPlus className="size-7" />
          </span>
          <span>
            <span className="block text-2xl font-semibold">Add Walk-In</span>
            <span
              className={cn(
                "mt-1 block text-sm",
                quickSource === "walk_in" ? "text-offwhite/70" : "text-ink-muted"
              )}
            >
              Quickly block a chair for someone at the salon.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            setQuickSource((current) => (current === "phone" ? null : "phone"))
          }
          className={cn(
            "flex min-h-28 items-center gap-5 rounded-2xl p-6 text-left shadow-sm transition-colors",
            quickSource === "phone"
              ? "bg-ink text-offwhite"
              : "bg-offwhite text-ink ring-1 ring-ink/5"
          )}
        >
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-xl",
              quickSource === "phone" ? "bg-offwhite/10" : "bg-secondary"
            )}
          >
            <Phone className="size-7" />
          </span>
          <span>
            <span className="block text-2xl font-semibold">Add Phone Booking</span>
            <span
              className={cn(
                "mt-1 block text-sm",
                quickSource === "phone" ? "text-offwhite/70" : "text-ink-muted"
              )}
            >
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

      {assignError && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {assignError}
        </p>
      )}

      <p className="mt-8 text-sm text-ink-muted">
        Drag booked appointments between columns to reassign technicians.
      </p>

      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        {columns.map((column) => {
          const items = appointmentsByColumn.get(column.id) ?? [];
          const isOff = column.showOffToggle ? offIds.has(column.id) : false;
          const isDropTarget = dropTargetId === column.id;
          const isAnyColumn = column.id === ANY_EMPLOYEE_ID;

          return (
            <section
              key={column.id}
              onDragOver={(event) => {
                if (!draggingId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetId(column.id);
              }}
              onDragLeave={() => {
                if (dropTargetId === column.id) setDropTargetId(null);
              }}
              onDrop={(event) => handleDrop(event, column.id)}
              className={cn(
                "rounded-2xl bg-offwhite p-5 ring-1 transition-all",
                isDropTarget ? "ring-2 ring-ink bg-secondary/40" : "ring-ink/5"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  {isAnyColumn && (
                    <span className="mt-1 flex size-10 items-center justify-center rounded-xl bg-secondary text-ink">
                      <Users className="size-5" />
                    </span>
                  )}
                  <div>
                    <h2 className="text-2xl font-semibold text-ink">{column.name}</h2>
                    {column.subtitle && (
                      <p className="text-sm text-ink-muted">{column.subtitle}</p>
                    )}
                  </div>
                </div>

                {column.showOffToggle && (
                  <button
                    type="button"
                    onClick={() => toggleOff(column.id)}
                    disabled={pendingOffId === column.id}
                    className={cn(
                      "flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                      isOff ? "bg-red-50 text-red-700" : "bg-secondary text-ink"
                    )}
                  >
                    {pendingOffId === column.id ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : isOff ? (
                      <ToggleRight className="size-5" />
                    ) : (
                      <ToggleLeft className="size-5" />
                    )}
                    {isOff ? "Off / Sick" : "Working"}
                  </button>
                )}
              </div>

              <div className="mt-5 min-h-24 space-y-3">
                {isOff && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    Marked off for today. This technician will not show online
                    availability.
                  </p>
                )}

                {items.length === 0 && !isOff && (
                  <p className="rounded-xl bg-background px-4 py-6 text-center text-ink-muted">
                    {isAnyColumn
                      ? "No unassigned appointments."
                      : "No appointments yet."}
                  </p>
                )}

                {items.map((appointment) => (
                  <div key={appointment.id} className="relative">
                    {assigningId === appointment.id && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80">
                        <Loader2 className="size-5 animate-spin text-ink" />
                      </div>
                    )}
                    <AppointmentCard
                      appointment={appointment}
                      draggable
                      isDragging={draggingId === appointment.id}
                      onDragStart={setDraggingId}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTargetId(null);
                      }}
                    />
                  </div>
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
  const bounds = useMemo(() => getBusinessTimeBounds(today), [today]);
  const defaultTime = useMemo(
    () =>
      clampTime(
        maxTime(bounds.minTime, getNextTimeSlot()),
        bounds.minTime,
        bounds.maxTime
      ),
    [bounds.minTime, bounds.maxTime]
  );

  const [technicianId, setTechnicianId] = useState(technicians[0]?.id ?? "");
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState("30");
  const [name, setName] = useState(source === "walk_in" ? "Walk-In Guest" : "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTime(defaultTime);
  }, [defaultTime]);

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

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Technician</span>
          <select
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
          >
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Duration</span>
          <select
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
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
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
          />
        </label>
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium text-ink">Start Time</span>
        <TimeWheelPicker
          value={time}
          onChange={setTime}
          minTime={bounds.minTime}
          maxTime={bounds.maxTime}
          className="mt-3 max-w-md"
        />
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
