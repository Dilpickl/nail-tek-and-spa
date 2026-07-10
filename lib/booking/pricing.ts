import {
  getServiceById,
  getServiceParent,
  type Service,
} from "@/lib/config/salonData";
import { formatPrice } from "@/lib/utils";

export function isPricingTbdService(serviceId: string): boolean {
  const service = getServiceById(serviceId);
  if (!service) return false;
  if (service.pricingTbd) return true;
  const parent = getServiceParent(serviceId);
  return Boolean(parent?.pricingTbd);
}

export function isPriceFromService(serviceId: string): boolean {
  const service = getServiceById(serviceId);
  if (!service) return false;
  if (service.priceFrom) return true;
  const parent = getServiceParent(serviceId);
  return Boolean(parent?.priceFrom);
}

export function getConfirmedServicePrice(serviceId: string): number {
  if (isPricingTbdService(serviceId)) return 0;
  return getServiceById(serviceId)?.price ?? 0;
}

export function computeBookingTotals(serviceIds: string[]) {
  let confirmedTotal = 0;
  let durationMinutes = 0;
  let hasTbdPricing = false;
  let hasFromPricing = false;

  for (const id of serviceIds) {
    const service = getServiceById(id);
    if (!service) continue;
    durationMinutes += service.durationMinutes;
    if (isPricingTbdService(id)) {
      hasTbdPricing = true;
    } else {
      confirmedTotal += service.price;
      if (isPriceFromService(id)) hasFromPricing = true;
    }
  }

  return { confirmedTotal, durationMinutes, hasTbdPricing, hasFromPricing };
}

/** Menu / gallery price label for a service (supports variants, from-pricing, TBD). */
export function formatServiceDisplayPrice(service: Service): string {
  if (service.pricingTbd) return "Priced at visit";

  if (service.variants?.length) {
    const prices = service.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const anyFrom =
      service.priceFrom || service.variants.some((v) => v.priceFrom);

    if (anyFrom || min !== max) {
      return `From ${formatPrice(min)}`;
    }
    return formatPrice(min);
  }

  if (service.priceFrom) return `From ${formatPrice(service.price)}`;
  return formatPrice(service.price);
}

export function formatServicePriceLabel(serviceId: string): string {
  if (isPricingTbdService(serviceId)) return "Priced at visit";
  const service = getServiceById(serviceId);
  if (!service) return "—";
  if (isPriceFromService(serviceId)) return `From ${formatPrice(service.price)}`;
  return formatPrice(service.price);
}

export function formatBookingTotalLabel(
  confirmedTotal: number,
  hasTbdPricing: boolean,
  hasFromPricing = false
): string {
  if (!hasTbdPricing && !hasFromPricing) return formatPrice(confirmedTotal);

  const pieces: string[] = [];
  if (confirmedTotal > 0) {
    pieces.push(
      hasFromPricing
        ? `From ${formatPrice(confirmedTotal)}`
        : `${formatPrice(confirmedTotal)} confirmed`
    );
  }
  if (hasTbdPricing) {
    pieces.push("items priced at visit");
  }
  return pieces.join(" + ") || "Priced at visit";
}
