import { getServiceById, getServiceCategoryId } from "@/lib/config/salonData";
import type { Service } from "@/lib/config/salonData";

export interface BookingPartyMember {
  id: string;
  label: string;
  serviceIds: string[];
  /** Preferred technician; defaults to "any" when omitted. */
  technicianId?: string;
}

export function getServicesByIds(serviceIds: string[]): Service[] {
  return serviceIds.map((id) => {
    const service = getServiceById(id);
    if (!service) {
      throw new Error(`Unknown service id: ${id}`);
    }
    return service;
  });
}

export function getTotalDurationMinutes(serviceIds: string[]): number {
  return getServicesByIds(serviceIds).reduce(
    (total, service) => total + service.durationMinutes,
    0
  );
}

/** Custom nail art is painted on top of a manicure, pedicure or set. */
export const NAIL_ART_SERVICE_ID = "addon-art";

/** Services nail art can go on (and that prompt the brow / lash add-on). */
const NAIL_BASE_CATEGORY_IDS = new Set(["pedicures", "manicures", "enhancements"]);

export function isNailBaseService(serviceId: string): boolean {
  return NAIL_BASE_CATEGORY_IDS.has(getServiceCategoryId(serviceId) ?? "");
}

/** True when nail art is selected without a manicure, pedicure or set to go on. */
export function needsNailArtBase(serviceIds: string[]): boolean {
  return serviceIds.includes(NAIL_ART_SERVICE_ID) && !serviceIds.some(isNailBaseService);
}

export function flattenPartyServiceIds(party: BookingPartyMember[]): string[] {
  return party.flatMap((member) => member.serviceIds);
}
