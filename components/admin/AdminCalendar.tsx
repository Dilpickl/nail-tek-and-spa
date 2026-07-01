"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  List,
  Loader2,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/admin/format";
import { parseLocalDate, shiftIsoDate, toIsoDate } from "@/lib/booking/time-utils";
import { cn } from "@/lib/utils";

type CalendarViewMode = "day" | "week" | "month" | "schedule";
type SortOption = "start_asc" | "start_desc" | "employee" | "service" | "status";

interface CalendarAppointment {
  id: string;
  technicianId: string | null;
  technicianName: string;
  anyTechnician: boolean;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  notes: string | null;
  partyGroupId: string | null;
  isGuest: boolean;
  services: string[];
}

interface CalendarTechnician {
  id: string;
  name: string;
  role: string | null;
  isActive: boolean;
}

interface CalendarApiResponse {
  technicians: CalendarTechnician[];
  appointments: CalendarAppointment[];
}

interface SelectedSlot {
  date: string;
  time: string | null;
}

interface StatusStyle {
  badge: string;
  border: string;
  dot: string;
}

const DEFAULT_STATUS_STYLE: StatusStyle = {
  badge: "bg-slate-100 text-slate-700",
  border: "border-slate-300 bg-slate-50/70",
  dot: "bg-slate-500",
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  booked: {
    badge: "bg-blue-100 text-blue-800",
    border: "border-blue-300 bg-blue-50/60",
    dot: "bg-blue-600",
  },
  completed: {
    badge: "bg-emerald-100 text-emerald-800",
    border: "border-emerald-300 bg-emerald-50/70",
    dot: "bg-emerald-600",
  },
  cancelled: {
    badge: "bg-rose-100 text-rose-800",
    border: "border-rose-300 bg-rose-50/70",
    dot: "bg-rose-600",
  },
  canceled: {
    badge: "bg-rose-100 text-rose-800",
    border: "border-rose-300 bg-rose-50/70",
    dot: "bg-rose-600",
  },
  no_show: {
    badge: "bg-amber-100 text-amber-800",
    border: "border-amber-300 bg-amber-50/70",
    dot: "bg-amber-600",
  },
  pending: {
    badge: "bg-violet-100 text-violet-800",
    border: "border-violet-300 bg-violet-50/70",
    dot: "bg-violet-600",
  },
};

function statusLabel(status: string): string {
  if (status === "no_show") return "No-Show";
  if (status === "cancelled") return "Canceled";
  if (status === "canceled") return "Canceled";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status.toLowerCase()] ?? DEFAULT_STATUS_STYLE;
}

function formatMonthDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatShortTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function startOfWeek(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  d.setDate(d.getDate() - d.getDay());
  return toIsoDate(d);
}

function endOfWeek(isoDate: string): string {
  return shiftIsoDate(startOfWeek(isoDate), 6);
}

function startOfMonth(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  d.setDate(1);
  return toIsoDate(d);
}

function endOfMonth(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  d.setMonth(d.getMonth() + 1, 0);
  return toIsoDate(d);
}

function monthGridStart(isoDate: string): string {
  return startOfWeek(startOfMonth(isoDate));
}

function visibleRangeLabel(view: CalendarViewMode, anchorDate: string): string {
  if (view === "day") {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${anchorDate}T00:00:00`));
  }
  if (view === "week") {
    const start = startOfWeek(anchorDate);
    const end = endOfWeek(anchorDate);
    return `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
  }
  if (view === "month") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date(`${anchorDate}T00:00:00`));
  }
  return "Schedule";
}

function rangeForView(view: CalendarViewMode, anchorDate: string): { start: string; end: string } {
  if (view === "day") return { start: anchorDate, end: anchorDate };
  if (view === "week") return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
  if (view === "month") {
    const start = monthGridStart(anchorDate);
    return { start, end: shiftIsoDate(start, 41) };
  }
  const start = shiftIsoDate(anchorDate, -14);
  return { start, end: shiftIsoDate(anchorDate, 31) };
}

function getDaySlots(date: string): string[] {
  const slots: string[] = [];
  const start = new Date(`${date}T08:00:00`);
  for (let i = 0; i < 28; i++) {
    const value = new Date(start);
    value.setMinutes(start.getMinutes() + i * 30);
    slots.push(value.toISOString());
  }
  return slots;
}

export function AdminCalendar() {
  const today = toIsoDate(new Date());
  const [view, setView] = useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(today);
  const initialRange = useMemo(() => rangeForView("week", today), [today]);
  const [rangeStart, setRangeStart] = useState(initialRange.start);
  const [rangeEnd, setRangeEnd] = useState(initialRange.end);

  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("start_asc");

  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [technicians, setTechnicians] = useState<CalendarTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>({
    date: anchorDate,
    time: null,
  });

  async function loadCalendarData(start: string, end: string) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ start, end });
      const response = await fetch(`/api/admin/calendar?${query.toString()}`);
      const body = (await response.json()) as CalendarApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Unable to load calendar data.");
      }

      setAppointments(body.appointments ?? []);
      setTechnicians(body.technicians ?? []);
    } catch (err) {
      setError((err as Error).message);
      setAppointments([]);
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCalendarData(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    setSelectedSlot((current) => ({ ...current, date: anchorDate }));
  }, [anchorDate]);

  const serviceOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const appointment of appointments) {
      for (const service of appointment.services) unique.add(service);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [appointments]);

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const appointment of appointments) unique.add(appointment.status);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let result = appointments.filter((appointment) => {
      if (employeeFilter !== "all") {
        if (employeeFilter === "any") {
          if (!appointment.anyTechnician) return false;
        } else if (appointment.technicianId !== employeeFilter) {
          return false;
        }
      }

      if (serviceFilter !== "all") {
        if (!appointment.services.includes(serviceFilter)) return false;
      }

      if (statusFilter !== "all") {
        if (appointment.status !== statusFilter) return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "start_asc") return a.startsAt.localeCompare(b.startsAt);
      if (sortBy === "start_desc") return b.startsAt.localeCompare(a.startsAt);
      if (sortBy === "employee") return a.technicianName.localeCompare(b.technicianName);
      if (sortBy === "service") {
        const aService = a.services[0] ?? "";
        const bService = b.services[0] ?? "";
        return aService.localeCompare(bService);
      }
      return a.status.localeCompare(b.status);
    });

    return result;
  }, [appointments, employeeFilter, serviceFilter, sortBy, statusFilter]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appointment of filteredAppointments) {
      const date = appointment.startsAt.slice(0, 10);
      const list = map.get(date) ?? [];
      list.push(appointment);
      map.set(date, list);
    }
    map.forEach((list, date) => {
      map.set(
        date,
        list.sort((a: CalendarAppointment, b: CalendarAppointment) =>
          a.startsAt.localeCompare(b.startsAt)
        )
      );
    });
    return map;
  }, [filteredAppointments]);

  const selectedAppointment = useMemo(
    () => filteredAppointments.find((item) => item.id === selectedAppointmentId) ?? null,
    [filteredAppointments, selectedAppointmentId]
  );

  const selectedSlotAppointments = useMemo(() => {
    const dayAppointments = appointmentsByDate.get(selectedSlot.date) ?? [];
    if (!selectedSlot.time) return dayAppointments;

    const slotStart = new Date(selectedSlot.time);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    return dayAppointments.filter((appointment) => {
      const start = new Date(appointment.startsAt);
      return start >= slotStart && start < slotEnd;
    });
  }, [appointmentsByDate, selectedSlot]);

  function jumpToToday() {
    setAnchorDate(today);
    const newRange = rangeForView(view, today);
    setRangeStart(newRange.start);
    setRangeEnd(newRange.end);
  }

  function stepRange(direction: -1 | 1) {
    if (view === "day") {
      setAnchorDate((current) => shiftIsoDate(current, direction));
      return;
    }
    if (view === "week") {
      setAnchorDate((current) => shiftIsoDate(current, direction * 7));
      return;
    }
    if (view === "month") {
      const d = parseLocalDate(anchorDate);
      d.setMonth(d.getMonth() + direction);
      setAnchorDate(toIsoDate(d));
      return;
    }
    setAnchorDate((current) => shiftIsoDate(current, direction * 7));
  }

  function setViewAndRange(nextView: CalendarViewMode) {
    setView(nextView);
    const nextRange = rangeForView(nextView, anchorDate);
    setRangeStart(nextRange.start);
    setRangeEnd(nextRange.end);
  }

  function selectDay(date: string) {
    setSelectedAppointmentId(null);
    setSelectedSlot({ date, time: null });
  }

  function selectSlot(date: string, timeIso: string) {
    setSelectedAppointmentId(null);
    setSelectedSlot({ date, time: timeIso });
  }

  function openAppointment(id: string) {
    setSelectedAppointmentId(id);
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, idx) => shiftIsoDate(start, idx));
  }, [anchorDate]);

  const monthCells = useMemo(() => {
    const start = monthGridStart(anchorDate);
    return Array.from({ length: 42 }, (_, idx) => shiftIsoDate(start, idx));
  }, [anchorDate]);

  return (
    <div className="container py-8 md:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Calendar
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-ink">
            {visibleRangeLabel(view, anchorDate)}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Day, week, month, and schedule views with inline details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["day", "week", "month", "schedule"] as CalendarViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={view === mode ? "default" : "outline"}
              onClick={() => setViewAndRange(mode)}
            >
              {mode === "schedule" ? <List className="size-4" /> : <CalendarDays className="size-4" />}
              {mode === "schedule"
                ? "Schedule"
                : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <section className="mt-6 rounded-2xl bg-offwhite p-4 ring-1 ring-ink/5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <label className="block text-sm">
              <span className="text-ink-muted">Employee</span>
              <select
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-ink"
              >
                <option value="all">All employees</option>
                <option value="any">Any Employee</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Service</span>
              <select
                value={serviceFilter}
                onChange={(event) => setServiceFilter(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-ink"
              >
                <option value="all">All services</option>
                {serviceOptions.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-ink"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-ink"
              >
                <option value="start_asc">Time (earliest)</option>
                <option value="start_desc">Time (latest)</option>
                <option value="employee">Employee</option>
                <option value="service">Service</option>
                <option value="status">Status</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Date range start</span>
              <input
                type="date"
                value={rangeStart}
                onChange={(event) => setRangeStart(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-ink"
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Date range end</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(event) => setRangeEnd(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-ink"
              />
            </label>
          </div>
          <div className="flex items-end justify-end gap-2">
            <Button variant="outline" onClick={() => stepRange(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => stepRange(1)}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="secondary" onClick={jumpToToday}>
              Today
            </Button>
            <Button variant="outline" onClick={() => void loadCalendarData(rangeStart, rangeEnd)}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-offwhite p-4 ring-1 ring-ink/5">
          {loading ? (
            <div className="flex min-h-[380px] items-center justify-center gap-2 text-ink-muted">
              <Loader2 className="size-5 animate-spin" />
              Loading calendar...
            </div>
          ) : view === "day" ? (
            <DayView
              date={anchorDate}
              slots={getDaySlots(anchorDate)}
              appointments={appointmentsByDate.get(anchorDate) ?? []}
              selectedSlot={selectedSlot}
              onSelectSlot={(timeIso) => selectSlot(anchorDate, timeIso)}
              onSelectAppointment={openAppointment}
            />
          ) : view === "week" ? (
            <WeekView
              days={weekDays}
              appointmentsByDate={appointmentsByDate}
              onSelectDay={selectDay}
              onSelectAppointment={openAppointment}
              selectedDate={selectedSlot.date}
            />
          ) : view === "month" ? (
            <MonthView
              anchorDate={anchorDate}
              cells={monthCells}
              appointmentsByDate={appointmentsByDate}
              onSelectDay={selectDay}
              onSelectAppointment={openAppointment}
              selectedDate={selectedSlot.date}
            />
          ) : (
            <ScheduleView appointments={filteredAppointments} onSelectAppointment={openAppointment} />
          )}
        </section>

        <aside className="rounded-2xl bg-offwhite p-4 ring-1 ring-ink/5 xl:sticky xl:top-28 xl:h-fit">
          {selectedAppointment ? (
            <AppointmentPanel appointment={selectedAppointment} />
          ) : (
            <SlotPanel
              date={selectedSlot.date}
              timeIso={selectedSlot.time}
              appointments={selectedSlotAppointments}
              onSelectAppointment={openAppointment}
            />
          )}
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-ink-muted" />
        {statusOptions.map((status) => {
          const style = statusStyle(status);
          return (
            <span
              key={status}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                style.badge
              )}
            >
              <span className={cn("size-2 rounded-full", style.dot)} />
              {statusLabel(status)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  date,
  slots,
  appointments,
  selectedSlot,
  onSelectSlot,
  onSelectAppointment,
}: {
  date: string;
  slots: string[];
  appointments: CalendarAppointment[];
  selectedSlot: SelectedSlot;
  onSelectSlot: (timeIso: string) => void;
  onSelectAppointment: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{formatWeekday(date)}</h2>
        <span className="text-sm text-ink-muted">{formatMonthDay(date)}</span>
      </div>
      <div className="space-y-2">
        {slots.map((slot) => {
          const slotStart = new Date(slot);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + 30);
          const slotAppointments = appointments.filter((appointment) => {
            const start = new Date(appointment.startsAt);
            return start >= slotStart && start < slotEnd;
          });
          const isSelected = selectedSlot.time === slot && selectedSlot.date === date;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                isSelected
                  ? "border-ink bg-background ring-1 ring-ink/20"
                  : "border-ink/10 bg-background hover:border-ink/30"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="w-16 shrink-0 text-sm font-semibold text-ink">
                  {formatShortTime(slot)}
                </span>
                <div className="flex-1">
                  {slotAppointments.length === 0 ? (
                    <p className="text-sm text-ink-muted">No appointments</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slotAppointments.map((appointment) => (
                        <AppointmentPill
                          key={appointment.id}
                          appointment={appointment}
                          onClick={() => onSelectAppointment(appointment.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  days,
  appointmentsByDate,
  onSelectDay,
  onSelectAppointment,
  selectedDate,
}: {
  days: string[];
  appointmentsByDate: Map<string, CalendarAppointment[]>;
  onSelectDay: (date: string) => void;
  onSelectAppointment: (id: string) => void;
  selectedDate: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day) => {
        const appointments = appointmentsByDate.get(day) ?? [];
        const isSelected = day === selectedDate;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "min-h-[320px] rounded-xl border p-3 text-left align-top transition-colors",
              isSelected
                ? "border-ink bg-background ring-1 ring-ink/20"
                : "border-ink/10 bg-background hover:border-ink/30"
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {formatWeekday(day)}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatMonthDay(day)}</p>
            <div className="mt-3 space-y-2">
              {appointments.length === 0 ? (
                <p className="text-xs text-ink-muted">No appointments</p>
              ) : (
                appointments.map((appointment) => (
                  <AppointmentPill
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => onSelectAppointment(appointment.id)}
                  />
                ))
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({
  anchorDate,
  cells,
  appointmentsByDate,
  onSelectDay,
  onSelectAppointment,
  selectedDate,
}: {
  anchorDate: string;
  cells: string[];
  appointmentsByDate: Map<string, CalendarAppointment[]>;
  onSelectDay: (date: string) => void;
  onSelectAppointment: (id: string) => void;
  selectedDate: string;
}) {
  const month = parseLocalDate(anchorDate).getMonth();
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {cells.map((day) => {
        const currentMonth = parseLocalDate(day).getMonth() === month;
        const appointments = appointmentsByDate.get(day) ?? [];
        const isSelected = day === selectedDate;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "min-h-[130px] rounded-xl border p-2 text-left transition-colors",
              currentMonth ? "bg-background" : "bg-secondary/30",
              isSelected ? "border-ink ring-1 ring-ink/20" : "border-ink/10 hover:border-ink/30"
            )}
          >
            <p className={cn("text-xs font-semibold", currentMonth ? "text-ink" : "text-ink-muted")}>
              {new Date(`${day}T00:00:00`).getDate()}
            </p>
            <div className="mt-1 space-y-1">
              {appointments.slice(0, 3).map((appointment) => (
                <AppointmentPill
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => onSelectAppointment(appointment.id)}
                />
              ))}
              {appointments.length > 3 && (
                <p className="text-[11px] font-medium text-ink-muted">
                  +{appointments.length - 3} more
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ScheduleView({
  appointments,
  onSelectAppointment,
}: {
  appointments: CalendarAppointment[];
  onSelectAppointment: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.12em] text-ink-muted">
            <th className="px-2 py-1">Time</th>
            <th className="px-2 py-1">Client</th>
            <th className="px-2 py-1">Employee</th>
            <th className="px-2 py-1">Service</th>
            <th className="px-2 py-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const style = statusStyle(appointment.status);
            return (
              <tr
                key={appointment.id}
                className="cursor-pointer rounded-xl bg-background ring-1 ring-ink/10 hover:ring-ink/25"
                onClick={() => onSelectAppointment(appointment.id)}
              >
                <td className="px-2 py-3 text-sm text-ink">{formatDateTime(appointment.startsAt)}</td>
                <td className="px-2 py-3 text-sm font-medium text-ink">{appointment.customerName}</td>
                <td className="px-2 py-3 text-sm text-ink">{appointment.technicianName}</td>
                <td className="px-2 py-3 text-sm text-ink-muted">
                  {appointment.services.join(", ") || "No services"}
                </td>
                <td className="px-2 py-3 text-sm">
                  <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", style.badge)}>
                    {statusLabel(appointment.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {appointments.length === 0 && (
        <p className="py-12 text-center text-sm text-ink-muted">No appointments in this range.</p>
      )}
    </div>
  );
}

function AppointmentPill({
  appointment,
  onClick,
}: {
  appointment: CalendarAppointment;
  onClick: () => void;
}) {
  const style = statusStyle(appointment.status);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "inline-flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-left text-xs transition-colors hover:brightness-95",
        style.border
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
      <span className="truncate font-medium text-ink">
        {formatShortTime(appointment.startsAt)} {appointment.customerName}
      </span>
    </span>
  );
}

function AppointmentPanel({ appointment }: { appointment: CalendarAppointment }) {
  const style = statusStyle(appointment.status);
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-muted">
        Appointment Detail
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-ink">{appointment.customerName}</h3>
      <div className="mt-2">
        <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", style.badge)}>
          {statusLabel(appointment.status)}
        </span>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <DetailRow icon={<Clock3 className="size-4" />} label="Time" value={formatDateTime(appointment.startsAt)} />
        <DetailRow
          icon={<UserRound className="size-4" />}
          label="Employee"
          value={appointment.technicianName}
        />
        <DetailRow label="Phone" value={appointment.customerPhone} />
        {appointment.customerEmail ? (
          <DetailRow label="Email" value={appointment.customerEmail} />
        ) : null}
        <DetailRow label="Source" value={appointment.source.replace("_", " ")} />
        <DetailRow label="Services" value={appointment.services.join(", ") || "No services"} />
        {appointment.notes ? <DetailRow label="Notes" value={appointment.notes} /> : null}
      </dl>
    </div>
  );
}

function SlotPanel({
  date,
  timeIso,
  appointments,
  onSelectAppointment,
}: {
  date: string;
  timeIso: string | null;
  appointments: CalendarAppointment[];
  onSelectAppointment: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-muted">
        Selection
      </p>
      <h3 className="mt-2 text-xl font-semibold text-ink">
        {formatMonthDay(date)}
        {timeIso ? ` at ${formatShortTime(timeIso)}` : ""}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        {appointments.length} appointment{appointments.length === 1 ? "" : "s"}
      </p>
      <div className="mt-4 space-y-2">
        {appointments.length === 0 ? (
          <p className="rounded-xl bg-background px-3 py-3 text-sm text-ink-muted">
            No appointments for this selection.
          </p>
        ) : (
          appointments.map((appointment) => (
            <button
              key={appointment.id}
              type="button"
              onClick={() => onSelectAppointment(appointment.id)}
              className="w-full rounded-xl bg-background px-3 py-3 text-left ring-1 ring-ink/10 transition-colors hover:ring-ink/25"
            >
              <p className="text-sm font-semibold text-ink">
                {formatShortTime(appointment.startsAt)} - {appointment.customerName}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {appointment.technicianName} - {statusLabel(appointment.status)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon ? <span className="mt-0.5 text-ink-muted">{icon}</span> : null}
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
    </div>
  );
}
