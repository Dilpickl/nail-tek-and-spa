import "server-only";

export interface BusyWindow {
  technician_id: string | null;
  any_technician: boolean;
  starts_at: string;
  ends_at: string;
}

export interface SlotUsage {
  /** Technicians with a confirmed assignment overlapping this slot. */
  assignedBusyIds: Set<string>;
  /** Unassigned "any employee" bookings overlapping this slot (each uses one chair). */
  unassignedCount: number;
  /** Chairs in use at this slot. */
  seatsUsed: number;
  /** Open chairs among active technicians at this slot. */
  remainingSeats: number;
}

function overlaps(start: Date, end: Date, busyStart: Date, busyEnd: Date) {
  return start < busyEnd && end > busyStart;
}

/**
 * How many chairs are in use for a slot.
 *
 * - Assigned bookings block only that technician.
 * - "Any employee" bookings consume one salon chair but do not block a named tech
 *   until someone is assigned in admin.
 */
export function getSlotUsage(
  busyWindows: BusyWindow[] | null | undefined,
  slotStart: Date,
  slotEnd: Date,
  activeTechCount: number
): SlotUsage {
  const assignedBusyIds = new Set<string>();
  let unassignedCount = 0;

  for (const busy of busyWindows ?? []) {
    if (!overlaps(slotStart, slotEnd, new Date(busy.starts_at), new Date(busy.ends_at))) {
      continue;
    }

    if (busy.any_technician) {
      unassignedCount += 1;
      continue;
    }

    if (busy.technician_id) {
      assignedBusyIds.add(busy.technician_id);
    }
  }

  const seatsUsed = assignedBusyIds.size + unassignedCount;
  const remainingSeats = Math.max(0, activeTechCount - seatsUsed);

  return {
    assignedBusyIds,
    unassignedCount,
    seatsUsed,
    remainingSeats,
  };
}
