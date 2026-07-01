import "server-only";

import type { DbTechnician, ResolvedTechnicianSchedule } from "@/lib/booking/technicians";
import { isTechnicianScheduledForSlot } from "@/lib/booking/technicians";
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
  timeOff: TimeOffWindow[],
  scheduleMap: Map<string, ResolvedTechnicianSchedule>
) {
  const schedule = scheduleMap.get(technicianId);
  if (!schedule?.isWorking) return false;
  if (!isTechnicianScheduledForSlot(schedule, start, end, date)) return false;
  if (isTechnicianOff(technicianId, date, start, end, timeOff)) return false;
  return !isTechnicianBusy(technicianId, start, end, busyWindows);
}

function getMemberTechnicianPreference(
  member: BookingPartyMember,
  fallbackTechnicianId?: TechnicianSelection
): TechnicianSelection {
  if (member.technicianId && member.technicianId !== "") {
    return member.technicianId;
  }
  if (fallbackTechnicianId && fallbackTechnicianId !== "any") {
    return fallbackTechnicianId;
  }
  return "any";
}

export function assignTechniciansForParty({
  date,
  slotStart,
  party,
  technicianId: fallbackTechnicianId = "any",
  busyWindows,
  timeOff,
  activeTechnicians,
  scheduleMap,
}: {
  date: string;
  slotStart: Date;
  party: BookingPartyMember[];
  technicianId?: TechnicianSelection;
  busyWindows: BusyWindow[];
  timeOff: TimeOffWindow[];
  activeTechnicians: DbTechnician[];
  scheduleMap: Map<string, ResolvedTechnicianSchedule>;
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

  for (const member of members) {
    const memberEnd = addMinutes(slotStart, getMemberDurationMinutes(member));
    const preference = getMemberTechnicianPreference(member, fallbackTechnicianId);

    if (preference !== "any") {
      if (
        usedTechIds.has(preference) ||
        !isTechnicianFreeForWindow(
          preference,
          date,
          slotStart,
          memberEnd,
          busyWindows,
          timeOff,
          scheduleMap
        )
      ) {
        return null;
      }

      usedTechIds.add(preference);
      assignments.push({
        member,
        technicianId: preference,
        anyTechnician: false,
      });
      continue;
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
      const parsed = JSON.parse(partyJson) as {
        label?: string;
        serviceIds?: string[];
        technicianId?: string;
      }[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((member, index) => ({
          id: String(index),
          label: member.label ?? (index === 0 ? "You" : `Guest ${index}`),
          serviceIds: member.serviceIds ?? [],
          technicianId: member.technicianId ?? "any",
        }));
      }
    } catch {
      // Fall through to legacy single-guest shape.
    }
  }

  if (fallbackServiceIds.length === 0) return [];

  return [{ id: "0", label: "You", serviceIds: fallbackServiceIds, technicianId: "any" }];
}

export function getMemberServices(member: BookingPartyMember) {
  return getServicesByIds(member.serviceIds);
}

/** True when every member with a specific tech preference can be satisfied at this slot. */
export function partyHasSpecificTechPreferences(party: BookingPartyMember[]): boolean {
  return getPartyMembersWithServices(party).some(
    (member) => getMemberTechnicianPreference(member) !== "any"
  );
}

export function getDistinctSpecificTechPreferences(party: BookingPartyMember[]): string[] {
  const ids = new Set<string>();
  for (const member of getPartyMembersWithServices(party)) {
    const pref = getMemberTechnicianPreference(member);
    if (pref !== "any") ids.add(pref);
  }
  return Array.from(ids);
}

export function findDuplicateSpecificTechnicianPreference(
  party: BookingPartyMember[]
): string | null {
  const seen = new Set<string>();
  for (const member of getPartyMembersWithServices(party)) {
    const pref = getMemberTechnicianPreference(member);
    if (pref === "any") continue;
    if (seen.has(pref)) return pref;
    seen.add(pref);
  }
  return null;
}
