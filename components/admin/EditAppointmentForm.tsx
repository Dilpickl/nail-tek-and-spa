"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { ANY_EMPLOYEE_ID, ANY_EMPLOYEE_LABEL } from "@/lib/admin/constants";
import { Button } from "@/components/ui/button";
import { TimeWheelPicker } from "@/components/ui/TimeWheelPicker";
import {
  clampTime,
  getBusinessTimeBounds,
  getNextTimeSlot,
  maxTime,
  toIsoDate,
} from "@/lib/booking/time-utils";
import { serviceCategories } from "@/lib/config/salonData";
import type { BookingTechnicianOption } from "@/lib/technicians/types";
import { formatMoney } from "@/lib/utils";

interface EditAppointmentFormProps {
  appointmentId: string;
  technicianId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  startsAt: string;
  serviceIds: string[];
  notes: string | null;
  technicians: BookingTechnicianOption[];
}

export function EditAppointmentForm({
  appointmentId,
  technicianId: initialTechId,
  customerName: initialName,
  customerPhone: initialPhone,
  customerEmail: initialEmail,
  startsAt,
  serviceIds: initialServiceIds,
  notes: initialNotes,
  technicians,
}: EditAppointmentFormProps) {
  const router = useRouter();
  const start = new Date(startsAt);

  const [technicianId, setTechnicianId] = useState(initialTechId);
  const [date, setDate] = useState(toIsoDate(start));
  const [time, setTime] = useState(
    `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
  );
  const [customerName, setCustomerName] = useState(initialName);
  const [customerPhone, setCustomerPhone] = useState(initialPhone);
  const [customerEmail, setCustomerEmail] = useState(initialEmail ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialServiceIds);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bounds = useMemo(() => getBusinessTimeBounds(date), [date]);
  const earliestTime = useMemo(() => {
    if (date !== toIsoDate(new Date())) return bounds.minTime;
    return clampTime(
      maxTime(bounds.minTime, getNextTimeSlot()),
      bounds.minTime,
      bounds.maxTime
    );
  }, [bounds.minTime, bounds.maxTime, date]);

  useEffect(() => {
    setTime((current) => clampTime(current, earliestTime, bounds.maxTime));
  }, [earliestTime, bounds.maxTime]);

  async function submit() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId,
          date,
          time,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          serviceIds: selectedServiceIds,
          notes: notes || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to save changes.");

      router.push(`/admin/appointments/${appointmentId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
        <h2 className="text-xl font-semibold text-ink">Schedule</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Technician</span>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
            >
              <option value={ANY_EMPLOYEE_ID}>{ANY_EMPLOYEE_LABEL}</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-ink">Start Time</p>
          <TimeWheelPicker
            value={time}
            onChange={setTime}
            minTime={bounds.minTime}
            maxTime={bounds.maxTime}
            className="mt-3"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
        <h2 className="text-xl font-semibold text-ink">Client</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Name</span>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Phone</span>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-ink">Email (optional)</span>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-ink"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
        <h2 className="text-xl font-semibold text-ink">Services</h2>
        <div className="mt-4 space-y-4">
          {serviceCategories.map((category) => (
            <div key={category.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-muted">
                {category.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {category.services.map((service) => {
                  const selected = selectedServiceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        selected
                          ? "bg-ink text-offwhite"
                          : "bg-background text-ink ring-1 ring-ink/10 hover:bg-secondary"
                      }`}
                    >
                      {service.name} ({formatMoney(service.price)})
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5">
        <label className="block">
          <span className="text-sm font-medium text-ink">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-ink"
          />
        </label>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="min-h-12 flex-1" onClick={submit} disabled={loading || selectedServiceIds.length === 0}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </Button>
        <Link
          href={`/admin/appointments/${appointmentId}`}
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-ink/20 px-5 text-sm font-medium text-ink hover:bg-ink hover:text-offwhite"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
