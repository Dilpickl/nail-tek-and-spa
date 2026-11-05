"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, GripVertical, Phone } from "lucide-react";

import { formatTime } from "@/lib/admin/format";
import {
  getAppointmentPhase,
  isActivePhase,
  phaseLabel,
  type AppointmentPhase,
} from "@/lib/admin/appointment-phase";
import type { AdminAppointment } from "@/components/admin/AdminDashboard";
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
  appointment: AdminAppointment;
  /** Derived display phase; computed from the clock when omitted. */
  phase?: AppointmentPhase;
  compact?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  isNew?: boolean;
  onOpen?: () => void;
  onDragStart?: (appointmentId: string) => void;
  onDragEnd?: () => void;
}

const PHASE_TAG_STYLES: Record<AppointmentPhase, string> = {
  upcoming: "bg-secondary text-ink",
  now: "bg-ink text-offwhite",
  done: "bg-transparent text-ink-muted ring-1 ring-ink/10",
  completed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-amber-50 text-amber-800",
};

export function AppointmentCard({
  appointment,
  phase: phaseProp,
  compact = false,
  draggable = false,
  isDragging = false,
  isNew = false,
  onOpen,
  onDragStart,
  onDragEnd,
}: AppointmentCardProps) {
  const router = useRouter();
  const phase = phaseProp ?? getAppointmentPhase(appointment);
  const isNow = phase === "now";
  // Past visits (done, completed, cancelled, no-show) recede and tighten up.
  const isPast = !isActivePhase(phase);
  const dense = compact || isPast;

  const canDrag = draggable && appointment.status === "booked" && isActivePhase(phase);

  function handleClick() {
    onOpen?.();
    router.push(`/admin/appointments/${appointment.id}`);
  }

  return (
    <div
      draggable={canDrag}
      onDragStart={(event) => {
        if (!canDrag) return;
        event.dataTransfer.setData("text/appointment-id", appointment.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.(appointment.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "relative rounded-xl bg-background ring-1 ring-ink/5 transition-all duration-500",
        canDrag && "cursor-grab active:cursor-grabbing",
        isPast && !isNew && "opacity-60 hover:opacity-100",
        isNow && !isNew && "ring-2 ring-ink shadow-md",
        isDragging && "opacity-50 ring-2 ring-ink/30",
        isNew && "bg-emerald-50 ring-2 ring-emerald-400 shadow-md",
        !isDragging && !isNew && "hover:shadow-md"
      )}
    >
      {isNew && (
        <span className="absolute -top-2 right-3 z-10 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
          New
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        className={cn("block w-full text-left", dense ? "px-4 py-3" : "p-4")}
      >
        <div className="flex items-start gap-3">
          {canDrag && (
            <span className="mt-1 text-ink-muted" aria-hidden>
              <GripVertical className="size-4" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={cn("font-semibold text-ink", dense ? "text-base" : "text-lg")}>
                  {appointment.customerName}
                </p>
                {appointment.partySize > 1 && (
                  <p className="mt-0.5 text-xs font-medium text-ink-muted">
                    {appointment.isGuest ? "Guest · " : ""}
                    Party of {appointment.partySize}
                  </p>
                )}
                {!dense && (
                  <p className="flex items-center gap-1 text-sm text-ink-muted">
                    <Phone className="size-3.5" />
                    {appointment.customerPhone}
                  </p>
                )}
              </div>
              <div className={cn("flex items-end gap-1", dense ? "flex-row" : "flex-col")}>
                {!isPast && (
                  <span className="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                    {sourceLabel(appointment.source)}
                  </span>
                )}
                <span
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                    PHASE_TAG_STYLES[phase]
                  )}
                >
                  {phase === "now" ? "Now" : phaseLabel(phase)}
                </span>
              </div>
            </div>

            <p
              className={cn(
                "flex items-center gap-2 text-sm font-semibold text-ink",
                dense ? "mt-1.5" : "mt-3"
              )}
            >
              <CalendarDays className="size-4" />
              Arrives {formatTime(appointment.startsAt)}
            </p>

            {appointment.services.length > 0 && (
              <p className={cn("text-sm text-ink-muted", dense ? "mt-1 truncate" : "mt-2")}>
                {appointment.services.join(", ")}
              </p>
            )}

            {canDrag && !compact && (
              <p className="mt-3 text-xs font-medium text-ink-muted">
                Drag to reassign, or tap to open
              </p>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

function sourceLabel(source: AdminAppointment["source"]) {
  if (source === "walk_in") return "Walk-In";
  if (source === "phone") return "Phone";
  return "Online";
}
