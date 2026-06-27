import type { CalculatedTotals, CompletionLineItemInput } from "@/lib/completion/types";

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

export function calculateTotals(
  lineItems: CompletionLineItemInput[],
  discountAmount: number,
  taxAmount: number,
  tipAmount: number
): CalculatedTotals {
  let subtotalServices = 0;
  let subtotalRetail = 0;

  for (const item of lineItems) {
    const lineTotal = calculateLineTotal(item.quantity, item.unitPrice);
    if (item.lineType === "retail") {
      subtotalRetail += lineTotal;
    } else {
      subtotalServices += lineTotal;
    }
  }

  const subtotal = subtotalServices + subtotalRetail;
  const discount = roundMoney(Math.max(0, discountAmount));
  const tax = roundMoney(Math.max(0, taxAmount));
  const tip = roundMoney(Math.max(0, tipAmount));
  const finalTotal = roundMoney(Math.max(0, subtotal - discount + tax + tip));

  return {
    subtotalServices: roundMoney(subtotalServices),
    subtotalRetail: roundMoney(subtotalRetail),
    discountAmount: discount,
    taxAmount: tax,
    tipAmount: tip,
    finalTotal,
  };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
