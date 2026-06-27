import "server-only";

import { technicians } from "@/lib/config/salonData";
import { getSlotUsage, type BusyWindow } from "@/lib/booking/slot-capacity";
import {
  getServicesByIds,
  getTotalDurationMinutes,
  type BookingPartyMember,
} from "@/lib/booking/service-utils";

export type TechnicianSelection = "any" | string;

export interface PartyMemberAssignment {
  member: BookingPartyMember;
  technicianId: string | null;
  anyTechnician: boolean;
}

interface TimeOffWindow {
  technician_id: string;
  off_date: string;
  full_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function overlaps(start: Date, end: Date, busyStart: Date, busyEnd: Date) {
  return start < busyEnd && end > busyStart;
}

export function getPartyMembersWithServices(party: BookingPartyMember[]): BookingPartyMember[] {
  return party.filter((member) => member.serviceIds.length > 0);
}

export function getMemberDurationMinutes(member: BookingPartyMember): number {
  return getTotalDurationMinutes(member.serviceIds);
}

export function getPartyMaxDurationMinutes(party: BookingPartyMember[]): number {
  const members = getPartyMembersWithServices(party);
  if (members.length === 0) return 0;
  return Math.max(...members.map(getMemberDurationMinutes));
}

function isTechnicianOff(
  technicianId: string,
  date: string,
  start: Date,
  end: Date,
  timeOff: TimeOffWindow[]
) {
  return timeOff.some((window) => {
    if (window.technician_id !== technicianId || window.off_date !== date) {
      return false;
    }

    if (window.full_day) return true;
    if (!window.starts_at || !window.ends_at) return false;

    return overlaps(start, end, new Date(window.starts_at), new Date(window.ends_at));
  });
}

function isTechnicianBusy(
  technicianId: string,
  start: Date,
  end: Date,
  busyWindows: BusyWindow[]
) {
  return busyWindows.some(
    (busy) =>
      busy.technician_id === technicianId &&
      overlaps(start, end, new Date(busy.starts_at), new Date(busy.ends_at))
  );
}

function isTechnicianFreeForWindow(
  technicianId: string,
  date: string,
  start: Date,
  end: Date,
  busyWindows: BusyWindow[],
  timeOff: TimeOffWindow[]
) {
  if (isTechnicianOff(technicianId, date, start, end, timeOff)) return false;
  return !isTechnicianBusy(technicianId, start, end, busyWindows);
}

export function assignTechniciansForParty({
  date,
  slotStart,
  party,
  technicianId,
  busyWindows,
  timeOff,
  activeTechnicians,
}: {
  date: string;
  slotStart: Date;
  party: BookingPartyMember[];
  technicianId: TechnicianSelection;
  busyWindows: BusyWindow[];
  timeOff: TimeOffWindow[];
  activeTechnicians: typeof technicians;
}): PartyMemberAssignment[] | null {
  const members = getPartyMembersWithServices(party);
  if (members.length === 0) return null;

  const maxEnd = addMinutes(slotStart, getPartyMaxDurationMinutes(party));
  const { remainingSeats } = getSlotUsage(
    busyWindows,
    slotStart,
    maxEnd,
    activeTechnicians.length
  );

  if (remainingSeats < members.length) return null;

  const usedTechIds = new Set<string>();
  const assignments: PartyMemberAssignment[] = [];

  for (let index = 0; index < members.length; index++) {
    const member = members[index];
    const memberEnd = addMinutes(slotStart, getMemberDurationMinutes(member));

    if (technicianId !== "any" && index === 0) {
      if (
        !isTechnicianFreeForWindow(
          technicianId,
          date,
          slotStart,
          memberEnd,
          busyWindows,
          timeOff
        )
      ) {
        return null;
      }

      usedTechIds.add(technicianId);
      assignments.push({
        member,
        technicianId,
        anyTechnician: false,
      });
      continue;
    }

    const freeTech = activeTechnicians.find(
      (technician) =>
        !usedTechIds.has(technician.id) &&
        isTechnicianFreeForWindow(
          technician.id,
          date,
          slotStart,
          memberEnd,
          busyWindows,
          timeOff
        )
    );

    if (freeTech) {
      usedTechIds.add(freeTech.id);
      assignments.push({
        member,
        technicianId: freeTech.id,
        anyTechnician: false,
      });
      continue;
    }

    if (technicianId !== "any") {
      return null;
    }

    assignments.push({
      member,
      technicianId: null,
      anyTechnician: true,
    });
  }

  const namedAssignments = assignments.filter((item) => !item.anyTechnician).length;
  const anyAssignments = assignments.length - namedAssignments;
  if (anyAssignments > 0 && remainingSeats < namedAssignments + anyAssignments) {
    return null;
  }

  return assignments;
}

export function parsePartyPayload(
  partyJson: string | null,
  fallbackServiceIds: string[]
): BookingPartyMember[] {
  if (partyJson) {
    try {
      const parsed = JSON.parse(partyJson) as { label?: string; serviceIds?: string[] }[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((member, index) => ({
          id: String(index),
          label: member.label ?? (index === 0 ? "You" : `Guest ${index}`),
          serviceIds: member.serviceIds ?? [],
        }));
      }
    } catch {
      // Fall through to legacy single-guest shape.
    }
  }

  if (fallbackServiceIds.length === 0) return [];

  return [{ id: "0", label: "You", serviceIds: fallbackServiceIds }];
}

export function getMemberServices(member: BookingPartyMember) {
  return getServicesByIds(member.serviceIds);
}
