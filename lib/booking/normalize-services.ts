import "server-only";

import { getServiceById, getServiceParent } from "@/lib/config/salonData";

/** Reject parent service ids that require a variant selection (e.g. nail art). */
export function validateBookableServiceIds(serviceIds: string[]): string | null {
  for (const id of serviceIds) {
    const service = getServiceById(id);
    if (!service) {
      return `Unknown service id: ${id}`;
    }

    if (service.variants?.length) {
      return `Please select a specific option for "${service.name}" instead of the general service.`;
    }
  }

  return null;
}

/** Expand any stray parent ids to their first variant (defensive server normalization). */
export function normalizeBookableServiceIds(serviceIds: string[]): string[] {
  return serviceIds.flatMap((id) => {
    const service = getServiceById(id);
    if (!service) return [id];

    if (service.variants?.length) {
      const firstVariant = service.variants[0];
      return firstVariant ? [firstVariant.id] : [];
    }

    return [id];
  });
}

export function isVariantServiceId(serviceId: string): boolean {
  return Boolean(getServiceParent(serviceId));
}
