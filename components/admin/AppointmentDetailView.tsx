"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  Phone,
  User,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBookingTotalLabel, isPricingTbdService, isPriceFromService } from "@/lib/booking/pricing";
import { formatDateTime, formatMoney } from "@/lib/admin/format";

interface BookedService {
  id: string;
  serviceId: string;
  name: string;
  priceAtBooking: number;
  durationAtBooking: number;
}

interface TransactionLineItem {
  name: string;
  lineType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Transaction {
  completedAt: string;
  paymentMethod: string;
  finalTotal: number;
  discountAmount: number;
  taxAmount: number;
  tipAmount: number;
  lineItems: TransactionLineItem[];
}

export interface AppointmentDetailData {
  id: string;
  technicianName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: "booked" | "completed" | "cancelled" | "no_show";
  source: string;
  notes: string | null;
  estimatedTotal: number;
  bookedServices: BookedService[];
  transaction: Transaction | null;
  partyGroupId: string | null;
  isGuest: boolean;
  partyMembers: PartyMemberSummary[];
}

interface PartyMemberSummary {
  id: string;
  customerName: string;
  technicianName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentDetailData["status"];
  services: string[];
  isCurrent: boolean;
}

export function AppointmentDetailView({ appointment }: { appointment: AppointmentDetailData }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<"cancelled" | "no_show" | null>(null);

  async function updateStatus(status: "cancelled" | "no_show") {
    setLoading(status);
    setError("");

    try {
      const response = await fetch(`/api/admin/appointments/${appointment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update status.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  const isBooked = appointment.status === "booked";

  const confirmCopy =
    confirmAction === "no_show"
      ? {
          title: "Mark as no-show?",
          description: `${appointment.customerName}'s appointment will be marked as a no-show. This cannot be undone.`,
          confirmLabel: "Yes, mark no-show",
        }
      : confirmAction === "cancelled"
        ? {
            title: "Cancel this appointment?",
            description: `${appointment.customerName}'s appointment will be cancelled. This cannot be undone.`,
            confirmLabel: "Yes, cancel appointment",
          }
        : null;

  return (
    <div className="container py-8 md:py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to Agenda
      </Link>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Appointment
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-ink">{appointment.customerName}</h1>
          <p className="mt-1 capitalize text-ink-muted">Status: {statusLabel(appointment.status)}</p>
        </div>

        {isBooked && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={`/admin/appointments/${appointment.id}/complete`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
            >
              <CheckCircle2 className="size-4" />
              Complete Appointment
            </Link>
            <Link
              href={`/admin/appointments/${appointment.id}/edit`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-ink/20 bg-transparent px-5 text-sm font-medium text-ink hover:bg-ink hover:text-offwhite"
            >
              <Pencil className="size-4" />
              Edit / Move
            </Link>
            <Button
              variant="outline"
              className="min-h-12"
              disabled={loading !== null}
              onClick={() => setConfirmAction("no_show")}
            >
              {loading === "no_show" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              No-Show
            </Button>
            <Button
              variant="outline"
              className="min-h-12"
              disabled={loading !== null}
              onClick={() => setConfirmAction("cancelled")}
            >
              {loading === "cancelled" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              Cancel
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {appointment.partyMembers.length > 1 && (
        <section className="mt-6 rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
          <h2 className="text-xl font-semibold text-ink">Party ({appointment.partyMembers.length} guests)</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Each guest has a separate appointment on the agenda and can be assigned to a different technician.
          </p>
          <ul className="mt-4 space-y-2">
            {appointment.partyMembers.map((member) => (
              <li key={member.id}>
                {member.isCurrent ? (
                  <div className="rounded-xl bg-background px-4 py-3 ring-1 ring-ink/10">
                    <p className="font-medium text-ink">
                      {member.customerName}
                      <span className="ml-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        Viewing
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {member.technicianName} · {formatDateTime(member.startsAt)} ·{" "}
                      {member.services.join(", ") || "No services"}
                    </p>
                  </div>
                ) : (
                  <Link
                    href={`/admin/appointments/${member.id}`}
                    className="block rounded-xl bg-background px-4 py-3 ring-1 ring-ink/5 transition-colors hover:ring-ink/20"
                  >
                    <p className="font-medium text-ink">{member.customerName}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {member.technicianName} · {formatDateTime(member.startsAt)} ·{" "}
                      {member.services.join(", ") || "No services"}
                    </p>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
          <h2 className="text-xl font-semibold text-ink">Client</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow icon={User} label="Name" value={appointment.customerName} />
            <InfoRow icon={Phone} label="Phone" value={appointment.customerPhone} />
            {appointment.customerEmail && (
              <InfoRow icon={Mail} label="Email" value={appointment.customerEmail} />
            )}
            <InfoRow icon={CalendarDays} label="When" value={formatDateTime(appointment.startsAt)} />
            <InfoRow icon={User} label="Technician" value={appointment.technicianName} />
          </dl>
        </section>

        <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
          <h2 className="text-xl font-semibold text-ink">Original Booking</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Scheduled services — preserved for history, never overwritten.
          </p>
          <ul className="mt-4 space-y-2">
            {appointment.bookedServices.map((svc) => (
              <li
                key={svc.id}
                className="flex items-center justify-between rounded-xl bg-background px-4 py-3 text-sm"
              >
                <span className="font-medium text-ink">{svc.name}</span>
                <span className="text-ink-muted">
                  {isPricingTbdService(svc.serviceId) && svc.priceAtBooking <= 0
                    ? "Priced at visit"
                    : isPriceFromService(svc.serviceId)
                      ? `From ${formatMoney(svc.priceAtBooking)}`
                      : formatMoney(svc.priceAtBooking)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-ink/10 pt-4 font-semibold text-ink">
            <span>Estimated Total</span>
            <span>
              {formatBookingTotalLabel(
                appointment.estimatedTotal,
                appointment.bookedServices.some((svc) =>
                  isPricingTbdService(svc.serviceId)
                ),
                appointment.bookedServices.some((svc) =>
                  isPriceFromService(svc.serviceId)
                )
              )}
            </span>
          </div>
        </section>
      </div>

      {appointment.transaction && (
        <section className="mt-5 rounded-2xl bg-ink p-6 text-offwhite">
          <h2 className="text-xl font-semibold">Completed Transaction</h2>
          <p className="mt-1 text-sm text-offwhite/70">
            Finalized {formatDateTime(appointment.transaction.completedAt)} ·{" "}
            {paymentLabel(appointment.transaction.paymentMethod)}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {appointment.transaction.lineItems.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex justify-between gap-4">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-1 border-t border-offwhite/20 pt-4 text-sm sm:grid-cols-2">
            <span>Discount: {formatMoney(appointment.transaction.discountAmount)}</span>
            <span>Tax: {formatMoney(appointment.transaction.taxAmount)}</span>
            <span>Tip: {formatMoney(appointment.transaction.tipAmount)}</span>
          </div>
          <div className="mt-4 flex justify-between text-2xl font-semibold">
            <span>Final Total</span>
            <span>{formatMoney(appointment.transaction.finalTotal)}</span>
          </div>
        </section>
      )}

      {confirmCopy && confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-status-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-offwhite p-6 shadow-xl ring-1 ring-ink/5">
            <h2 id="confirm-status-title" className="text-xl font-semibold text-ink">
              {confirmCopy.title}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">{confirmCopy.description}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="min-h-11"
                disabled={loading !== null}
                onClick={() => setConfirmAction(null)}
              >
                Go back
              </Button>
              <Button
                className="min-h-11"
                disabled={loading !== null}
                onClick={() => {
                  void updateStatus(confirmAction).then(() => setConfirmAction(null));
                }}
              >
                {loading === confirmAction ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {confirmCopy.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-ink-muted" />
      <div>
        <dt className="text-ink-muted">{label}</dt>
        <dd className="font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

function statusLabel(status: AppointmentDetailData["status"]) {
  if (status === "no_show") return "No-Show";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    apple_pay: "Apple Pay",
    other: "Other",
  };
  return labels[method] ?? method;
}
