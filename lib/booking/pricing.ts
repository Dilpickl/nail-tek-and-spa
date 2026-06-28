import {
  getServiceById,
  getServiceParent,
} from "@/lib/config/salonData";
import { formatPrice } from "@/lib/utils";

export function isPricingTbdService(serviceId: string): boolean {
  const service = getServiceById(serviceId);
  if (!service) return false;
  if (service.pricingTbd) return true;
  const parent = getServiceParent(serviceId);
  return Boolean(parent?.pricingTbd);
}

export function getConfirmedServicePrice(serviceId: string): number {
  if (isPricingTbdService(serviceId)) return 0;
  return getServiceById(serviceId)?.price ?? 0;
}

export function computeBookingTotals(serviceIds: string[]) {
  let confirmedTotal = 0;
  let durationMinutes = 0;
  let hasTbdPricing = false;

  for (const id of serviceIds) {
    const service = getServiceById(id);
    if (!service) continue;
    durationMinutes += service.durationMinutes;
    if (isPricingTbdService(id)) {
      hasTbdPricing = true;
    } else {
      confirmedTotal += service.price;
    }
  }

  return { confirmedTotal, durationMinutes, hasTbdPricing };
}

export function formatServicePriceLabel(serviceId: string): string {
  if (isPricingTbdService(serviceId)) return "Priced at visit";
  const service = getServiceById(serviceId);
  return service ? formatPrice(service.price) : "—";
}

export function formatBookingTotalLabel(
  confirmedTotal: number,
  hasTbdPricing: boolean
): string {
  if (!hasTbdPricing) return formatPrice(confirmedTotal);
  if (confirmedTotal > 0) {
    return `${formatPrice(confirmedTotal)} confirmed + nail art (priced at visit)`;
  }
  return "Nail art (priced at visit)";
}
