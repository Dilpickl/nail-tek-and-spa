import { allServices, type Service } from "@/lib/config/salonData";

export interface BookingPartyMember {
  id: string;
  label: string;
  serviceIds: string[];
}

const serviceById = new Map(allServices.map((service) => [service.id, service]));

export function getServicesByIds(serviceIds: string[]): Service[] {
  return serviceIds.map((id) => {
    const service = serviceById.get(id);
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

export function flattenPartyServiceIds(party: BookingPartyMember[]): string[] {
  return party.flatMap((member) => member.serviceIds);
}
