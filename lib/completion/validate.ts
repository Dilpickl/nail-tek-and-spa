import {
  getRetailProductById,
  getServiceById,
  isAddonService,
} from "@/lib/config/salonData";
import { isPricingTbdService } from "@/lib/booking/pricing";
import {
  calculateLineTotal,
  calculateTotals,
  roundMoney,
} from "@/lib/completion/calculate-totals";
import type {
  CompleteAppointmentInput,
  CompletionLineItemInput,
  PaymentMethod,
  TransactionLineType,
} from "@/lib/completion/types";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "apple_pay", "other"];

export function validateCompletionPayload(payload: CompleteAppointmentInput): string | null {
  if (!payload.lineItems?.length) {
    return "At least one line item is required.";
  }

  if (!PAYMENT_METHODS.includes(payload.paymentMethod)) {
    return "A valid payment method is required.";
  }

  for (const item of payload.lineItems) {
    const error = validateLineItem(item);
    if (error) return error;
  }

  if (payload.discountAmount < 0 || payload.taxAmount < 0 || payload.tipAmount < 0) {
    return "Discount, tax, and tip must be zero or greater.";
  }

  return null;
}

function validateLineItem(item: CompletionLineItemInput): string | null {
  if (!item.name?.trim()) return "Each line item needs a name.";
  if (!item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) {
    return "Quantity must be a positive whole number.";
  }
  if (item.unitPrice < 0) return "Unit price cannot be negative.";

  if (item.lineType === "retail") {
    if (!item.productId) return "Retail items require a product id.";
    const product = getRetailProductById(item.productId);
    if (!product) return `Unknown retail product: ${item.productId}.`;
    return null;
  }

  if (!item.serviceId) return "Service items require a service id.";
  const service = getServiceById(item.serviceId);
  if (!service) return `Unknown service: ${item.serviceId}.`;

  if (isPricingTbdService(item.serviceId) && item.unitPrice <= 0) {
    return `Enter the final nail art price for "${item.name.trim()}".`;
  }

  return null;
}

export function normalizeLineItems(items: CompletionLineItemInput[]): CompletionLineItemInput[] {
  return items.map((item) => {
    let lineType: TransactionLineType = item.lineType;
    if (item.lineType === "service" && item.serviceId && isAddonService(item.serviceId)) {
      lineType = "addon";
    }

    return {
      ...item,
      lineType,
      name: item.name.trim(),
      unitPrice: roundMoney(item.unitPrice),
      quantity: item.quantity,
    };
  });
}

export function buildLineItemsFromBooking(
  bookedServices: {
    service_id: string;
    price_at_booking: number;
  }[]
): CompletionLineItemInput[] {
  return bookedServices.map((row) => {
    const service = getServiceById(row.service_id);
    const lineType: TransactionLineType = isAddonService(row.service_id) ? "addon" : "service";
    return {
      lineType,
      serviceId: row.service_id,
      productId: null,
      name: service?.name ?? row.service_id,
      quantity: 1,
      unitPrice: Number(row.price_at_booking),
    };
  });
}

export function buildCompletionTotals(payload: CompleteAppointmentInput) {
  const lineItems = normalizeLineItems(payload.lineItems);
  const totals = calculateTotals(
    lineItems,
    payload.discountAmount,
    payload.taxAmount,
    payload.tipAmount
  );

  const lineRows = lineItems.map((item) => ({
    line_type: item.lineType,
    service_id: item.serviceId ?? null,
    product_id: item.productId ?? null,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: calculateLineTotal(item.quantity, item.unitPrice),
  }));

  return { totals, lineRows, lineItems };
}

export { PAYMENT_METHODS };
