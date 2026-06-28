"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CompletionLineItemInput, PaymentMethod } from "@/lib/completion/types";
import { calculateTotals } from "@/lib/completion/calculate-totals";
import { isPricingTbdService, formatBookingTotalLabel } from "@/lib/booking/pricing";
import {
  allServices,
  retailProducts,
  serviceCategories,
} from "@/lib/config/salonData";
import { formatMoney } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/completion/validate";

interface BookedService {
  id: string;
  serviceId: string;
  name: string;
  priceAtBooking: number;
}

interface CompleteAppointmentFormProps {
  appointmentId: string;
  bookedServices: BookedService[];
  estimatedTotal: number;
}

interface EditableLineItem extends CompletionLineItemInput {
  key: string;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  apple_pay: "Apple Pay",
  other: "Other",
};

export function CompleteAppointmentForm({
  appointmentId,
  bookedServices,
  estimatedTotal,
}: CompleteAppointmentFormProps) {
  const router = useRouter();
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() =>
    bookedServices.map((svc) => ({
      key: svc.id,
      lineType: svc.serviceId.startsWith("addon-") ? "addon" : "service",
      serviceId: svc.serviceId,
      productId: null,
      name: svc.name,
      quantity: 1,
      unitPrice: svc.priceAtBooking,
    }))
  );
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddRetail, setShowAddRetail] = useState(false);

  const totals = useMemo(
    () => calculateTotals(lineItems, discountAmount, taxAmount, tipAmount),
    [lineItems, discountAmount, taxAmount, tipAmount]
  );

  const hasTbdBookedServices = bookedServices.some((svc) =>
    isPricingTbdService(svc.serviceId)
  );
  const hasUnsetTbdPricing = lineItems.some(
    (item) =>
      item.serviceId &&
      isPricingTbdService(item.serviceId) &&
      item.unitPrice <= 0
  );

  const unchangedFromBooking =
    !hasUnsetTbdPricing &&
    lineItems.length === bookedServices.length &&
    bookedServices.every((svc) => {
      const item = lineItems.find((l) => l.serviceId === svc.serviceId);
      return item && item.unitPrice === svc.priceAtBooking && item.quantity === 1;
    }) &&
    discountAmount === 0 &&
    taxAmount === 0 &&
    tipAmount === 0;

  function updateLineItem(key: string, patch: Partial<EditableLineItem>) {
    setLineItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }

  function removeLineItem(key: string) {
    setLineItems((current) => current.filter((item) => item.key !== key));
  }

  function addService(serviceId: string) {
    const service = allServices.find((s) => s.id === serviceId);
    if (!service) return;
    setLineItems((current) => [
      ...current,
      {
        key: `new-${serviceId}-${Date.now()}`,
        lineType: serviceId.startsWith("addon-") ? "addon" : "service",
        serviceId,
        productId: null,
        name: service.name,
        quantity: 1,
        unitPrice: service.price,
      },
    ]);
    setShowAddService(false);
  }

  function addRetail(productId: string) {
    const product = retailProducts.find((p) => p.id === productId);
    if (!product) return;
    setLineItems((current) => [
      ...current,
      {
        key: `retail-${productId}-${Date.now()}`,
        lineType: "retail",
        serviceId: null,
        productId,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
      },
    ]);
    setShowAddRetail(false);
  }

  async function submit() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems: lineItems.map(({ key: _key, ...item }) => item),
          discountAmount,
          taxAmount,
          tipAmount,
          paymentMethod,
          notes,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(body.error || "Unable to complete appointment.");

      router.push(`/admin/appointments/${appointmentId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Completion Details</h2>
            <p className="text-sm text-ink-muted">
              Original estimate:{" "}
              {formatBookingTotalLabel(estimatedTotal, hasTbdBookedServices)}
              {unchangedFromBooking && " — no changes detected, one-click ready."}
            </p>
          </div>
        </div>

        {hasTbdBookedServices && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            This appointment includes nail art priced at the visit. Enter the final
            charge for each nail art line before completing checkout.
          </p>
        )}

        <div className="mt-5 space-y-3">
          {lineItems.length === 0 && (
            <p className="rounded-xl bg-background px-4 py-6 text-center text-ink-muted">
              No line items. Add a service or retail product to continue.
            </p>
          )}

          {lineItems.map((item) => {
            const needsFinalPrice = Boolean(
              item.serviceId && isPricingTbdService(item.serviceId)
            );

            return (
            <div
              key={item.key}
              className="grid gap-3 rounded-xl bg-background p-4 ring-1 ring-ink/5 md:grid-cols-[1fr_auto_auto_auto]"
            >
              <div>
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="text-xs uppercase tracking-wide text-ink-muted">
                  {item.lineType}
                  {needsFinalPrice && " · priced at visit"}
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Qty</span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(item.key, {
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="mt-1 h-10 w-20 rounded-md border border-input bg-offwhite px-2 text-ink"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-ink-muted">
                  {needsFinalPrice ? "Final price *" : "Price"}
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateLineItem(item.key, {
                      unitPrice: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={`mt-1 h-10 w-28 rounded-md border bg-offwhite px-2 text-ink ${
                    needsFinalPrice && item.unitPrice <= 0
                      ? "border-amber-500 ring-1 ring-amber-500"
                      : "border-input"
                  }`}
                />
              </label>

              <div className="flex items-end justify-between gap-3 md:flex-col md:items-end">
                <p className="text-sm font-semibold text-ink">
                  {needsFinalPrice && item.unitPrice <= 0
                    ? "TBD"
                    : formatMoney(item.quantity * item.unitPrice)}
                </p>
                <button
                  type="button"
                  onClick={() => removeLineItem(item.key)}
                  className="rounded-md p-2 text-red-600 hover:bg-red-50"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowAddService((v) => !v)}>
            <Plus className="size-4" />
            Add Service
          </Button>
          <Button variant="outline" onClick={() => setShowAddRetail((v) => !v)}>
            <Plus className="size-4" />
            Add Retail
          </Button>
        </div>

        {showAddService && (
          <div className="mt-4 rounded-xl bg-background p-4 ring-1 ring-ink/5">
            {serviceCategories.map((category) => (
              <div key={category.id} className="mb-4 last:mb-0">
                <p className="text-sm font-semibold text-ink">{category.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {category.services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => addService(service.id)}
                      className="rounded-full bg-secondary px-3 py-1.5 text-sm text-ink hover:bg-accent"
                    >
                      {service.name} ({formatMoney(service.price)})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddRetail && (
          <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-background p-4 ring-1 ring-ink/5">
            {retailProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addRetail(product.id)}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm text-ink hover:bg-accent"
              >
                {product.name} ({formatMoney(product.price)})
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MoneyField label="Discount" value={discountAmount} onChange={setDiscountAmount} />
        <MoneyField label="Tax" value={taxAmount} onChange={setTaxAmount} />
        <MoneyField label="Tip" value={tipAmount} onChange={setTipAmount} />
      </section>

      <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
        <label className="block">
          <span className="text-sm font-medium text-ink">Payment Method</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-ink md:max-w-xs"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_LABELS[method]}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-ink">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-ink"
          />
        </label>
      </section>

      <section className="rounded-2xl bg-ink p-6 text-offwhite">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <TotalRow label="Services" value={totals.subtotalServices} />
          <TotalRow label="Retail" value={totals.subtotalRetail} />
          <TotalRow label="Discount" value={-totals.discountAmount} />
          <TotalRow label="Tax" value={totals.taxAmount} />
          <TotalRow label="Tip" value={totals.tipAmount} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-offwhite/20 pt-4">
          <span className="text-lg font-medium">Final Total</span>
          <span className="text-3xl font-semibold">{formatMoney(totals.finalTotal)}</span>
        </div>
      </section>

      {hasUnsetTbdPricing && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Enter the final nail art price before completing this appointment.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <Button
        className="min-h-14 w-full text-lg"
        onClick={submit}
        disabled={loading || lineItems.length === 0 || hasUnsetTbdPricing}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : unchangedFromBooking ? (
          "Complete Appointment"
        ) : (
          "Complete with Changes"
        )}
      </Button>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-xl bg-offwhite p-4 ring-1 ring-ink/5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="rounded-md bg-secondary p-2"
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          min={0}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-ink"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="rounded-md bg-secondary p-2"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </label>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-offwhite/70">{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}
