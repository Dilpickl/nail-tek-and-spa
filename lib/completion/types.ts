export type PaymentMethod = "cash" | "card" | "apple_pay" | "other";

export type TransactionLineType = "service" | "retail" | "addon";

export interface CompletionLineItemInput {
  lineType: TransactionLineType;
  serviceId?: string | null;
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CompleteAppointmentInput {
  lineItems: CompletionLineItemInput[];
  discountAmount: number;
  taxAmount: number;
  tipAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CalculatedTotals {
  subtotalServices: number;
  subtotalRetail: number;
  discountAmount: number;
  taxAmount: number;
  tipAmount: number;
  finalTotal: number;
}
