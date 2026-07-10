"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Plus,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Users,
  Check,
  ChevronDown,
} from "lucide-react";

import { AppointmentCard } from "@/components/admin/AppointmentCard";
import { Button } from "@/components/ui/button";
import { TimeWheelPicker } from "@/components/ui/TimeWheelPicker";
import { ANY_EMPLOYEE_ID, ANY_EMPLOYEE_LABEL } from "@/lib/admin/constants";
import {
  clearQueuedAppointmentHighlights,
  queueAppointmentHighlights,
  readQueuedAppointmentHighlights,
} from "@/lib/admin/highlight-appointments";
import { formatMonthDay, formatReadableDate } from "@/lib/admin/format";
import {
  getNextTimeSlot,
  shiftIsoDate,
} from "@/lib/booking/time-utils";
import { serviceCategories, getServiceById } from "@/lib/config/salonData";
import type { BookingTechnicianOption } from "@/lib/technicians/types";
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
  partyGroupId: string | null;
  isGuest: boolean;
  partySize: number;
}

interface AdminDashboardProps {
  today: string;
  agendaDate: string;
  appointments: AdminAppointment[];
  offTechnicianIds: string[];
  technicians: BookingTechnicianOption[];
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
  agendaDate,
  appointments,
  offTechnicianIds,
  technicians,
}: AdminDashboardProps) {
  const router = useRouter();
  const isToday = agendaDate === today;
  const isTomorrow = agendaDate === shiftIsoDate(today, 1);
  const isYesterday = agendaDate === shiftIsoDate(today, -1);
  const agendaHeading = isToday
    ? "Today's Agenda"
    : isTomorrow
      ? "Tomorrow"
      : isYesterday
        ? "Yesterday"
        : formatMonthDay(agendaDate);
  const [notice, setNotice] = useState("");
  const [quickSource, setQuickSource] = useState<QuickSource | null>(null);
  const [pendingOffId, setPendingOffId] = useState("");
  const [offIds, setOffIds] = useState(new Set(offTechnicianIds));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState("");
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addHighlights(ids: string[]) {
    if (ids.length === 0) return;

    setHighlightedIds((current) => new Set([...Array.from(current), ...ids]));

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = setTimeout(() => {
      setHighlightedIds(new Set());
      highlightTimerRef.current = null;
    }, 12_000);
  }

  function clearHighlight(appointmentId: string) {
    setHighlightedIds((current) => {
      if (!current.has(appointmentId)) return current;
      const next = new Set(current);
      next.delete(appointmentId);
      return next;
    });
  }

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const queued = readQueuedAppointmentHighlights();
    if (queued.length === 0) return;

    clearQueuedAppointmentHighlights();
    addHighlights(queued);
  }, [appointments]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-new-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload) => {
          const row = payload.new as { id?: string; starts_at?: string };
          if (!row.id || !row.starts_at) return;

          const appointmentDate = row.starts_at.slice(0, 10);
          if (appointmentDate !== agendaDate) return;

          queueAppointmentHighlights([row.id]);
          addHighlights([row.id]);
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agendaDate, router]);

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
        subtitle: technician.role ?? "Team member",
        showOffToggle: true,
      })),
    ],
    [technicians]
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

  const bookedAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "booked")
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments]
  );
  const bookedCount = bookedAppointments.length;
  const bookedScrollIndexRef = useRef(0);

  useEffect(() => {
    bookedScrollIndexRef.current = 0;
  }, [agendaDate, bookedCount]);

  function scrollToNextBookedAppointment() {
    if (bookedAppointments.length === 0) return;

    const index = bookedScrollIndexRef.current % bookedAppointments.length;
    const target = bookedAppointments[index];
    bookedScrollIndexRef.current = index + 1;

    const element = document.getElementById(`appointment-${target.id}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.classList.add("ring-2", "ring-ink", "ring-offset-2");
    window.setTimeout(() => {
      element?.classList.remove("ring-2", "ring-ink", "ring-offset-2");
    }, 1600);
  }

  async function toggleOff(technicianId: string) {
    const nextOff = !offIds.has(technicianId);
    setPendingOffId(technicianId);

    try {
      const response = await fetch("/api/admin/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId, date: agendaDate, off: nextOff }),
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

  function goToAgendaDate(date: string) {
    const params = new URLSearchParams();
    if (date !== today) params.set("date", date);
    const query = params.toString();
    router.push(query ? `/admin?${query}` : "/admin");
  }

  return (
    <div className="container py-8 md:py-10">
      {bookedCount > 0 ? (
        <button
          type="button"
          aria-live="polite"
          onClick={scrollToNextBookedAppointment}
          className="fixed bottom-6 right-6 z-30 flex max-w-[min(18rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-left text-offwhite shadow-lg ring-1 ring-ink/20 transition hover:bg-ink/90"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-offwhite/10">
            <CalendarClock className="size-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold leading-tight">
              {bookedCount} still booked
            </span>
            <span className="mt-0.5 block text-xs text-offwhite/70">
              Tap to jump to next · {formatReadableDate(agendaDate)}
            </span>
          </span>
        </button>
      ) : (
        <aside
          aria-live="polite"
          className="fixed bottom-6 right-6 z-30 flex max-w-[min(18rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl bg-offwhite px-4 py-3 text-ink shadow-lg ring-1 ring-ink/10"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <CalendarClock className="size-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold leading-tight">
              0 still booked
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              All done for {formatReadableDate(agendaDate)}
            </span>
          </span>
        </aside>
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Admin Dashboard
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold text-ink">
            {agendaHeading}
          </h1>
          {!isToday && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
              Not today
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="default"
            aria-label="Previous day"
            onClick={() => goToAgendaDate(shiftIsoDate(agendaDate, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-[14rem] text-center text-ink-muted">
            {formatReadableDate(agendaDate)}
          </p>
          <Button
            variant="outline"
            size="default"
            aria-label="Next day"
            onClick={() => goToAgendaDate(shiftIsoDate(agendaDate, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          {!isToday && (
            <Button variant="secondary" onClick={() => goToAgendaDate(today)}>
              Back to today
            </Button>
          )}
        </div>
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
          agendaDate={agendaDate}
          technicians={technicians}
          onClose={() => setQuickSource(null)}
          onBookingCreated={(appointmentId) => {
            queueAppointmentHighlights([appointmentId]);
            addHighlights([appointmentId]);
          }}
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
                    Marked off for {isToday ? "today" : "this day"}. This technician
                    will not show online availability.
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
                  <div
                    key={appointment.id}
                    id={`appointment-${appointment.id}`}
                    className="relative scroll-mt-28 rounded-xl transition ring-offset-background"
                  >
                    {assigningId === appointment.id && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80">
                        <Loader2 className="size-5 animate-spin text-ink" />
                      </div>
                    )}
                    <AppointmentCard
                      appointment={appointment}
                      draggable
                      isDragging={draggingId === appointment.id}
                      isNew={highlightedIds.has(appointment.id)}
                      onOpen={() => clearHighlight(appointment.id)}
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
  agendaDate,
  technicians,
  onClose,
  onBookingCreated,
}: {
  source: QuickSource;
  today: string;
  agendaDate: string;
  technicians: BookingTechnicianOption[];
  onClose: () => void;
  onBookingCreated: (appointmentId: string) => void;
}) {
  const router = useRouter();
  const isWalkIn = source === "walk_in";

  const [phoneDate, setPhoneDate] = useState(today);
  const activeDate = isWalkIn ? agendaDate : phoneDate;

  const defaultTime = useMemo(() => {
    return activeDate === today ? getNextTimeSlot() : "09:00";
  }, [activeDate, today]);

  const [technicianId, setTechnicianId] = useState(ANY_EMPLOYEE_ID);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    serviceCategories[0]?.services[0]?.id ? [serviceCategories[0].services[0].id] : []
  );
  const [time, setTime] = useState(defaultTime);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTime(defaultTime);
  }, [defaultTime, activeDate]);

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  async function submit() {
    if (!name.trim()) {
      setError("Guest name is required.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Please select at least one service.");
      return;
    }
    if (!isWalkIn && !phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/quick-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          technicianId,
          serviceIds: selectedServiceIds,
          date: activeDate,
          time,
          customerName: name,
          ...(isWalkIn ? {} : { customerPhone: phone }),
        }),
      });
      const body = (await response.json()) as { error?: string; appointmentId?: string };

      if (!response.ok) throw new Error(body.error || "Unable to create booking.");

      if (body.appointmentId) {
        onBookingCreated(body.appointmentId);
      }

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
          {isWalkIn ? "Add Walk-In" : "Add Phone Booking"}
        </h2>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="text-sm font-medium text-ink">Technician</span>
          <div className="relative mt-2">
            <select
              value={technicianId}
              onChange={(event) => setTechnicianId(event.target.value)}
              className="h-12 w-full min-w-0 appearance-none rounded-xl border border-input bg-background px-3 pr-10 text-ink"
            >
              <option value={ANY_EMPLOYEE_ID}>{ANY_EMPLOYEE_LABEL}</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.role
                    ? `${technician.name} — ${technician.role}`
                    : technician.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          </div>
        </label>

        <div className="block min-w-0 sm:col-span-2">
          <span className="text-sm font-medium text-ink">Services</span>
          <ServiceMultiSelect
            selectedIds={selectedServiceIds}
            onToggle={toggleService}
            className="mt-2"
          />
        </div>

        <label className="block min-w-0">
          <span className="text-sm font-medium text-ink">Guest name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Type guest name here"
            className="mt-2 h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-ink placeholder:text-ink-muted"
          />
        </label>

        {!isWalkIn && (
          <label className="block min-w-0">
            <span className="text-sm font-medium text-ink">Phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(555) 123-4567"
              inputMode="tel"
              className="mt-2 h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-ink placeholder:text-ink-muted"
            />
          </label>
        )}

        {!isWalkIn && (
          <label className="block min-w-0 sm:col-span-2 sm:max-w-xs">
            <span className="text-sm font-medium text-ink">Date</span>
            <input
              type="date"
              value={phoneDate}
              min={today}
              onChange={(event) => setPhoneDate(event.target.value)}
              className="mt-2 h-12 w-full max-w-full min-w-0 rounded-xl border border-input bg-background px-3 text-ink [color-scheme:light]"
            />
          </label>
        )}
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium text-ink">Start Time</span>
        <TimeWheelPicker
          value={time}
          onChange={setTime}
          minTime="06:00"
          maxTime="23:45"
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
        {isWalkIn ? "Add Walk-In" : "Add Phone Booking"}
      </Button>
    </div>
  );
}

function serviceSelectionLabel(selectedIds: string[]) {
  if (selectedIds.length === 0) return "Select services";
  if (selectedIds.length === 1) {
    return getServiceById(selectedIds[0])?.name ?? "1 service";
  }
  if (selectedIds.length === 2) {
    return selectedIds
      .map((id) => getServiceById(id)?.name)
      .filter(Boolean)
      .join(", ");
  }
  return `${selectedIds.length} services selected`;
}

function ServiceMultiSelect({
  selectedIds,
  onToggle,
  className,
}: {
  selectedIds: string[];
  onToggle: (serviceId: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-ink"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={cn("truncate", selectedIds.length === 0 && "text-ink-muted")}>
          {serviceSelectionLabel(selectedIds)}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-input bg-background py-1 shadow-lg ring-1 ring-ink/5"
        >
          {serviceCategories.map((category) => (
            <div key={category.id}>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {category.name}
              </p>
              {category.services.map((service) => {
                const selected = selectedIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onToggle(service.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "bg-secondary font-medium text-ink"
                        : "text-ink hover:bg-secondary/60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-ink bg-ink text-offwhite"
                          : "border-ink/25 bg-background"
                      )}
                    >
                      {selected && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="flex-1">{service.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
