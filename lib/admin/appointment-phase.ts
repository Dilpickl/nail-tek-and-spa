/**
 * Display phase for an appointment, derived at read time.
 *
 * The salon rarely records a checkout, so a `booked` appointment whose end
 * time has passed is treated as done. Nothing is written back to the DB:
 * `cancelled`, `no_show` and `completed` pass through unchanged, and a booked
 * appointment is "upcoming", "now" (in the chair) or "done" based on the clock.
 */
export type AppointmentStatus = "booked" | "completed" | "cancelled" | "no_show";

export type AppointmentPhase =
  | "upcoming"
  | "now"
  | "done"
  | "completed"
  | "cancelled"
  | "no_show";

interface PhaseInput {
  status: string;
  startsAt: string;
  endsAt: string;
}

function toMs(value: number | Date | undefined): number {
  if (value === undefined) return Date.now();
  return typeof value === "number" ? value : value.getTime();
}

export function getAppointmentPhase(
  appointment: PhaseInput,
  now?: number | Date
): AppointmentPhase {
  const status = appointment.status.toLowerCase();
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "no_show") return "no_show";

  const nowMs = toMs(now);
  const start = new Date(appointment.startsAt).getTime();
  const end = new Date(appointment.endsAt).getTime();

  if (end < nowMs) return "done";
  if (start <= nowMs) return "now";
  return "upcoming";
}

/** True while the visit has not happened yet or is in progress. */
export function isActivePhase(phase: AppointmentPhase): boolean {
  return phase === "upcoming" || phase === "now";
}

/** True when the visit counts as served (checked out or past its end time). */
export function isDonePhase(phase: AppointmentPhase): boolean {
  return phase === "done" || phase === "completed";
}

export function phaseLabel(phase: AppointmentPhase): string {
  switch (phase) {
    case "upcoming":
      return "Upcoming";
    case "now":
      return "In progress";
    case "done":
      return "Done";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "No-Show";
  }
}
