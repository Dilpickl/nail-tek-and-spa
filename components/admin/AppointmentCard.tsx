"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, GripVertical, Phone } from "lucide-react";

import { formatTimeRange } from "@/lib/admin/format";
import type { AdminAppointment } from "@/components/admin/AdminDashboard";
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
  appointment: AdminAppointment;
  compact?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (appointmentId: string) => void;
  onDragEnd?: () => void;
}

export function AppointmentCard({
  appointment,
  compact = false,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: AppointmentCardProps) {
  const router = useRouter();
  const statusStyles: Record<AdminAppointment["status"], string> = {
    booked: "bg-secondary text-ink",
    completed: "bg-emerald-50 text-emerald-800",
    cancelled: "bg-red-50 text-red-700",
    no_show: "bg-amber-50 text-amber-800",
  };

  const canDrag = draggable && appointment.status === "booked";

  function handleClick() {
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
        "rounded-xl bg-background ring-1 ring-ink/5 transition-shadow",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-ink/30",
        !isDragging && "hover:shadow-md"
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className="block w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          {canDrag && (
            <span className="mt-1 text-ink-muted" aria-hidden>
              <GripVertical className="size-4" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={cn("font-semibold text-ink", compact ? "text-base" : "text-lg")}>
                  {appointment.customerName}
                </p>
                {!compact && (
                  <p className="flex items-center gap-1 text-sm text-ink-muted">
                    <Phone className="size-3.5" />
                    {appointment.customerPhone}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  {sourceLabel(appointment.source)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                    statusStyles[appointment.status]
                  )}
                >
                  {statusLabel(appointment.status)}
                </span>
              </div>
            </div>

            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarDays className="size-4" />
              {formatTimeRange(appointment.startsAt, appointment.endsAt)}
            </p>

            {appointment.services.length > 0 && (
              <p className="mt-2 text-sm text-ink-muted">{appointment.services.join(", ")}</p>
            )}

            {appointment.status === "booked" && (
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-ink-muted">
                <CheckCircle2 className="size-3.5" />
                {canDrag ? "Drag to reassign, or tap to open" : "Tap to view or complete"}
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

function statusLabel(status: AdminAppointment["status"]) {
  if (status === "no_show") return "No-Show";
  return status;
}
