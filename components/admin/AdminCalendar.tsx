"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/admin/format";
import {
  getAppointmentPhase,
  phaseLabel,
  type AppointmentPhase,
} from "@/lib/admin/appointment-phase";
import { useNow } from "@/lib/admin/use-now";
import { formatInSalonTime, getDayOfWeek, shiftIsoDate, toIsoDate, toLocalDateTime } from "@/lib/booking/time-utils";
import { cn } from "@/lib/utils";

type CalendarViewMode = "week" | "month";

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
  /** Derived at read time: past booked visits read as "done". */
  displayStatus: string;
}

type RawCalendarAppointment = Omit<CalendarAppointment, "displayStatus">;

interface CalendarTechnician {
  id: string;
  name: string;
  role: string | null;
  isActive: boolean;
}

interface CalendarApiResponse {
  technicians: CalendarTechnician[];
  appointments: RawCalendarAppointment[];
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
  upcoming: {
    badge: "bg-blue-100 text-blue-800",
    border: "border-blue-300 bg-blue-50/60",
    dot: "bg-blue-600",
  },
  now: {
    badge: "bg-ink text-offwhite",
    border: "border-ink bg-blue-50",
    dot: "bg-ink",
  },
  done: {
    badge: "bg-slate-100 text-slate-600",
    border: "border-slate-200 bg-slate-50/60 opacity-75",
    dot: "bg-slate-400",
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

const KNOWN_STATUSES = new Set(["booked", "completed", "cancelled", "canceled", "no_show"]);

/** Booked visits become upcoming / now / done; other statuses pass through. */
function deriveDisplayStatus(appointment: RawCalendarAppointment, now: number): string {
  if (!KNOWN_STATUSES.has(appointment.status.toLowerCase())) return appointment.status;
  return getAppointmentPhase(appointment, now);
}

const PHASE_ORDER: AppointmentPhase[] = ["now", "upcoming", "done", "completed", "no_show", "cancelled"];

function statusLabel(status: string): string {
  if ((PHASE_ORDER as string[]).includes(status)) return phaseLabel(status as AppointmentPhase);
  if (status === "no_show") return "No-Show";
  if (status === "cancelled" || status === "canceled") return "Canceled";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status.toLowerCase()] ?? DEFAULT_STATUS_STYLE;
}

function formatMonthDay(date: string): string {
  return formatInSalonTime(toLocalDateTime(date, "12:00"), {
    month: "short",
    day: "numeric",
  });
}

function formatWeekday(date: string): string {
  return formatInSalonTime(toLocalDateTime(date, "12:00"), {
    weekday: "short",
  });
}

function formatShortTime(value: string): string {
  return formatInSalonTime(value, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfWeek(isoDate: string): string {
  return shiftIsoDate(isoDate, -getDayOfWeek(isoDate));
}

function endOfWeek(isoDate: string): string {
  return shiftIsoDate(startOfWeek(isoDate), 6);
}

function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 8)}01`;
}

function monthGridStart(isoDate: string): string {
  return startOfWeek(startOfMonth(isoDate));
}

function visibleRangeLabel(view: CalendarViewMode, anchorDate: string): string {
  if (view === "week") {
    const start = startOfWeek(anchorDate);
    const end = endOfWeek(anchorDate);
    return `${formatMonthDay(start)} – ${formatMonthDay(end)}`;
  }
  return formatInSalonTime(toLocalDateTime(anchorDate, "12:00"), {
    month: "long",
    year: "numeric",
  });
}

function rangeForView(view: CalendarViewMode, anchorDate: string): { start: string; end: string } {
  if (view === "week") return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
  const start = monthGridStart(anchorDate);
  return { start, end: shiftIsoDate(start, 41) };
}

export function AdminCalendar() {
  const today = toIsoDate(new Date());
  const [view, setView] = useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(today);
  const initialRange = useMemo(() => rangeForView("week", today), [today]);
  const [rangeStart, setRangeStart] = useState(initialRange.start);
  const [rangeEnd, setRangeEnd] = useState(initialRange.end);

  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [rawAppointments, setAppointments] = useState<RawCalendarAppointment[]>([]);
  const now = useNow();
  const appointments = useMemo<CalendarAppointment[]>(
    () =>
      rawAppointments.map((appointment) => ({
        ...appointment,
        displayStatus: deriveDisplayStatus(appointment, now),
      })),
    [rawAppointments, now]
  );
  const [technicians, setTechnicians] = useState<CalendarTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);

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

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const appointment of appointments) unique.add(appointment.displayStatus);
    const rank = (status: string) => {
      const index = (PHASE_ORDER as string[]).indexOf(status);
      return index === -1 ? PHASE_ORDER.length : index;
    };
    return Array.from(unique).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        if (employeeFilter !== "all" && appointment.technicianId !== employeeFilter) {
          return false;
        }
        if (statusFilter !== "all" && appointment.displayStatus !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [appointments, employeeFilter, statusFilter]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appointment of filteredAppointments) {
      const date = appointment.startsAt.slice(0, 10);
      const list = map.get(date) ?? [];
      list.push(appointment);
      map.set(date, list);
    }
    return map;
  }, [filteredAppointments]);

  const selectedAppointment = useMemo(
    () => filteredAppointments.find((item) => item.id === selectedAppointmentId) ?? null,
    [filteredAppointments, selectedAppointmentId]
  );

  const selectedDayAppointments = useMemo(
    () => appointmentsByDate.get(selectedDate) ?? [],
    [appointmentsByDate, selectedDate]
  );

  function jumpToToday() {
    setAnchorDate(today);
    setSelectedDate(today);
    const newRange = rangeForView(view, today);
    setRangeStart(newRange.start);
    setRangeEnd(newRange.end);
  }

  function stepRange(direction: -1 | 1) {
    if (view === "week") {
      const next = shiftIsoDate(anchorDate, direction * 7);
      setAnchorDate(next);
      const nextRange = rangeForView("week", next);
      setRangeStart(nextRange.start);
      setRangeEnd(nextRange.end);
      return;
    }

    const [year, month] = anchorDate.split("-").map(Number);
    const nextMonth = month + direction;
    const nextYear = year + Math.floor((nextMonth - 1) / 12);
    const normalizedMonth = ((nextMonth - 1) % 12 + 12) % 12;
    const next = `${nextYear}-${String(normalizedMonth + 1).padStart(2, "0")}-01`;
    setAnchorDate(next);
    const nextRange = rangeForView("month", next);
    setRangeStart(nextRange.start);
    setRangeEnd(nextRange.end);
  }

  function setViewAndRange(nextView: CalendarViewMode) {
    setView(nextView);
    const nextRange = rangeForView(nextView, anchorDate);
    setRangeStart(nextRange.start);
    setRangeEnd(nextRange.end);
  }

  // Below xl the details panel is stacked under the calendar, so bring it
  // into view after a tap; otherwise the tap looks like it did nothing.
  function revealDetailsPanel() {
    if (typeof window === "undefined" || window.matchMedia("(min-width: 1280px)").matches) return;
    window.requestAnimationFrame(() => {
      document
        .getElementById("calendar-details-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectDay(date: string) {
    setSelectedAppointmentId(null);
    setSelectedDate(date);
    revealDetailsPanel();
  }

  function openAppointment(id: string) {
    setSelectedAppointmentId(id);
    revealDetailsPanel();
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
            Browse appointments by week or month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["week", "month"] as CalendarViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={view === mode ? "default" : "outline"}
              className="min-h-11"
              onClick={() => setViewAndRange(mode)}
            >
              <CalendarDays className="size-4" />
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <section className="mt-6 rounded-2xl bg-offwhite p-4 ring-1 ring-ink/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-muted">Employee</span>
              <select
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-2 text-base text-ink sm:text-sm"
              >
                <option value="all">All employees</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-2 text-base text-ink sm:text-sm"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:flex sm:items-end">
            <Button
              variant="outline"
              className="min-h-11"
              aria-label={view === "week" ? "Previous week" : "Previous month"}
              onClick={() => stepRange(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              aria-label={view === "week" ? "Next week" : "Next month"}
              onClick={() => stepRange(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="secondary" className="min-h-11" onClick={jumpToToday}>
              Today
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              aria-label="Refresh"
              onClick={() => void loadCalendarData(rangeStart, rangeEnd)}
            >
              <RefreshCw className="size-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-offwhite p-4 ring-1 ring-ink/5">
          {loading ? (
            <div className="flex min-h-[380px] items-center justify-center gap-2 text-ink-muted">
              <Loader2 className="size-5 animate-spin" />
              Loading calendar...
            </div>
          ) : view === "week" ? (
            <WeekView
              days={weekDays}
              appointmentsByDate={appointmentsByDate}
              onSelectDay={selectDay}
              onSelectAppointment={openAppointment}
              selectedDate={selectedDate}
            />
          ) : (
            <MonthView
              anchorDate={anchorDate}
              cells={monthCells}
              appointmentsByDate={appointmentsByDate}
              onSelectDay={selectDay}
              onSelectAppointment={openAppointment}
              selectedDate={selectedDate}
            />
          )}
        </section>

        <aside
          id="calendar-details-panel"
          className="scroll-mt-4 rounded-2xl bg-offwhite p-4 ring-1 ring-ink/5 xl:sticky xl:top-28 xl:h-fit"
        >
          {selectedAppointment ? (
            <AppointmentPanel
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointmentId(null)}
            />
          ) : (
            <DaySummary
              date={selectedDate}
              appointments={selectedDayAppointments}
              onSelectAppointment={openAppointment}
            />
          )}
        </aside>
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
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const appointments = appointmentsByDate.get(day) ?? [];
        const isSelected = day === selectedDate;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex min-w-0 flex-col items-stretch justify-start rounded-xl border p-3 text-left transition-colors lg:min-h-[280px]",
              isSelected
                ? "border-ink bg-background ring-1 ring-ink/20"
                : "border-ink/10 bg-background hover:border-ink/30"
            )}
          >
            <p className="flex items-baseline gap-2 lg:block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {formatWeekday(day)}
              </span>
              <span className="text-sm font-semibold text-ink lg:mt-1 lg:block">
                {formatMonthDay(day)}
              </span>
            </p>
            <div className="mt-2 space-y-2 lg:mt-3">
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
  const month = Number(anchorDate.slice(5, 7));
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
        <p
          key={name}
          className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted lg:text-left"
        >
          <span className="sm:hidden">{name.charAt(0)}</span>
          <span className="hidden sm:inline">{name}</span>
        </p>
      ))}
      {cells.map((day) => {
        const currentMonth = Number(day.slice(5, 7)) === month;
        const appointments = appointmentsByDate.get(day) ?? [];
        const isSelected = day === selectedDate;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-stretch justify-start rounded-lg border p-1.5 text-left transition-colors sm:min-h-20 lg:min-h-[110px] lg:rounded-xl lg:p-2",
              currentMonth ? "bg-background" : "bg-secondary/30",
              isSelected ? "border-ink ring-1 ring-ink/20" : "border-ink/10 hover:border-ink/30"
            )}
          >
            <p className={cn("text-xs font-semibold", currentMonth ? "text-ink" : "text-ink-muted")}>
              {Number(day.slice(8, 10))}
            </p>
            {appointments.length > 0 && (
              <div className="mt-auto flex flex-wrap items-center gap-0.5 pt-1 lg:hidden">
                {appointments.slice(0, 4).map((appointment) => (
                  <span
                    key={appointment.id}
                    className={cn("size-1.5 rounded-full", statusStyle(appointment.displayStatus).dot)}
                  />
                ))}
                {appointments.length > 4 && (
                  <span className="text-[10px] font-medium leading-none text-ink-muted">
                    +{appointments.length - 4}
                  </span>
                )}
              </div>
            )}
            <div className="mt-1 hidden space-y-1 lg:block">
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

function AppointmentPill({
  appointment,
  onClick,
}: {
  appointment: CalendarAppointment;
  onClick: () => void;
}) {
  const style = statusStyle(appointment.displayStatus);
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
        "inline-flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm lg:px-2 lg:py-1 lg:text-xs transition-colors hover:brightness-95",
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

function AppointmentPanel({
  appointment,
  onClose,
}: {
  appointment: CalendarAppointment;
  onClose: () => void;
}) {
  const style = statusStyle(appointment.displayStatus);
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-muted">
            Appointment
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">{appointment.customerName}</h3>
        </div>
        <Button variant="outline" size="sm" className="h-10 px-4 text-sm" onClick={onClose}>
          Back
        </Button>
      </div>
      <div className="mt-2">
        <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", style.badge)}>
          {statusLabel(appointment.displayStatus)}
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
        <DetailRow label="Services" value={appointment.services.join(", ") || "No services"} />
        {appointment.notes ? <DetailRow label="Notes" value={appointment.notes} /> : null}
      </dl>
    </div>
  );
}

function DaySummary({
  date,
  appointments,
  onSelectAppointment,
}: {
  date: string;
  appointments: CalendarAppointment[];
  onSelectAppointment: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-muted">
        Selected day
      </p>
      <h3 className="mt-2 text-xl font-semibold text-ink">{formatMonthDay(date)}</h3>
      <p className="mt-1 text-sm text-ink-muted">
        {appointments.length} appointment{appointments.length === 1 ? "" : "s"}
      </p>
      <div className="mt-4 space-y-2">
        {appointments.length === 0 ? (
          <p className="rounded-xl bg-background px-3 py-3 text-sm text-ink-muted">
            No appointments for this day.
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
                {formatShortTime(appointment.startsAt)} – {appointment.customerName}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {appointment.technicianName} · {statusLabel(appointment.displayStatus)}
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
