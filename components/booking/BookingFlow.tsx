"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Scissors,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  getServiceById,
  serviceCategories,
  technicians,
} from "@/lib/config/salonData";
import { formatDuration, formatPrice, cn } from "@/lib/utils";
import {
  filterPastSlots,
  getDefaultBookingDate,
  getNextOpenDate,
  isSalonClosed,
  toIsoDate,
} from "@/lib/booking/time-utils";
import { Button } from "@/components/ui/button";

type Step = 1 | 2 | 3 | 4 | 5;

interface PartyMember {
  id: string;
  label: string;
  serviceIds: string[];
}

interface BookingSlot {
  time: string;
  technicianIds: string[];
}

interface BookingConfirmation {
  appointmentId: string;
  technicianName: string;
  startsAt: string;
  customerName: string;
  party: PartyMember[];
  estimatedTotal: number;
  durationMinutes: number;
}

interface BookingFlowProps {
  preselectedServiceId?: string;
}

const stepLabels = ["Services", "Technician", "Date & Time", "Details", "Confirm"];

export function BookingFlow({ preselectedServiceId }: BookingFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [party, setParty] = useState<PartyMember[]>(() => [
    {
      id: "primary",
      label: "You",
      serviceIds: preselectedServiceId ? [preselectedServiceId] : [],
    },
  ]);
  const [technicianId, setTechnicianId] = useState("any");
  const [selectedDate, setSelectedDate] = useState(() => getDefaultBookingDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [details, setDetails] = useState({ name: "", phone: "", email: "" });
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  const selectedServiceIds = useMemo(
    () => party.flatMap((member) => member.serviceIds),
    [party]
  );
  const partyPayload = useMemo(
    () =>
      JSON.stringify(
        party.map((member) => ({ label: member.label, serviceIds: member.serviceIds }))
      ),
    [party]
  );
  const selectedServices = useMemo(
    () =>
      selectedServiceIds
        .map((id) => getServiceById(id))
        .filter((service): service is NonNullable<typeof service> => Boolean(service)),
    [selectedServiceIds]
  );
  const totals = useMemo(
    () =>
      selectedServices.reduce(
        (total, service) => ({
          price: total.price + service.price,
          duration: total.duration + service.durationMinutes,
        }),
        { price: 0, duration: 0 }
      ),
    [selectedServices]
  );

  const autoDateAdjusted = useRef(false);

  function handleContinue() {
    const errorField = getStepValidationError(step, {
      party,
      selectedTime,
      details,
    });

    if (errorField) {
      if (highlightedField === errorField) {
        scrollToBookingField(errorField);
      } else {
        setHighlightedField(errorField);
      }
      return;
    }

    setHighlightedField(null);
    setStep((current) => Math.min(5, current + 1) as Step);
  }

  // Only reset the chosen time when availability inputs change — not when
  // advancing to the next booking step (which was clearing the selection).
  useEffect(() => {
    setSelectedTime("");
  }, [selectedDate, partyPayload, technicianId]);

  useEffect(() => {
    if (selectedServiceIds.length === 0 || step < 3) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    const loadSlots = async () => {
      setLoadingSlots(true);
      setSlotError("");

      const params = new URLSearchParams({
        date: selectedDate,
        technicianId,
        party: partyPayload,
      });

      try {
        const response = await fetch(`/api/availability?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          slots?: BookingSlot[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(body.error || "Unable to load availability.");
        }

        setSlots(filterPastSlots(selectedDate, body.slots ?? []));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSlots([]);
          setSlotError((error as Error).message);
        }
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
    return () => controller.abort();
  }, [selectedDate, partyPayload, step, technicianId]);

  // On step 3, skip closed days and auto-advance if today has no remaining slots.
  useEffect(() => {
    if (step !== 3) {
      autoDateAdjusted.current = false;
      return;
    }

    if (isSalonClosed(selectedDate)) {
      const fallback = getDefaultBookingDate();
      if (fallback !== selectedDate) setSelectedDate(fallback);
      return;
    }

    if (loadingSlots || slotError || slots.length > 0) return;

    const today = toIsoDate(new Date());
    if (selectedDate !== today || autoDateAdjusted.current) return;

    const next = getNextOpenDate(selectedDate);
    if (next) {
      autoDateAdjusted.current = true;
      setSelectedDate(next);
    }
  }, [step, loadingSlots, slotError, slots.length, selectedDate]);

  function clearFieldHighlight(fieldId: string) {
    setHighlightedField((current) => (current === fieldId ? null : current));
  }

  useLayoutEffect(() => {
    if (!highlightedField) return;
    scrollToBookingField(highlightedField);
  }, [highlightedField]);

  if (confirmation) {
    return <BookingConfirmationView confirmation={confirmation} />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <BookingSteps step={step} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl bg-offwhite p-5 ring-1 ring-ink/5 sm:p-8">
          {step === 1 && (
            <ServiceStep
              party={party}
              setParty={setParty}
              highlightedField={highlightedField}
              onFieldEdit={clearFieldHighlight}
            />
          )}

          {step === 2 && (
            <TechnicianStep
              technicianId={technicianId}
              setTechnicianId={setTechnicianId}
              partySize={party.length}
            />
          )}

          {step === 3 && (
            <DateTimeStep
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              slots={slots}
              loadingSlots={loadingSlots}
              slotError={slotError}
              technicianId={technicianId}
              highlightedField={highlightedField}
              onFieldEdit={clearFieldHighlight}
            />
          )}

          {step === 4 && (
            <DetailsStep
              details={details}
              setDetails={setDetails}
              highlightedField={highlightedField}
              onFieldEdit={clearFieldHighlight}
            />
          )}

          {step === 5 && (
            <ConfirmStep
              party={party}
              technicianId={technicianId}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              details={details}
              smsConsent={smsConsent}
              setSmsConsent={setSmsConsent}
            />
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1 || submitting}
              onClick={() => setStep((current) => Math.max(1, current - 1) as Step)}
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>

            {step < 5 ? (
              <Button type="button" onClick={handleContinue}>
                Continue
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!smsConsent || submitting}
                onClick={() =>
                  submitBooking({
                    party,
                    technicianId,
                    selectedDate,
                    selectedTime,
                    details,
                    setSubmitting,
                    setSubmitError,
                    setConfirmation,
                  })
                }
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Create Appointment
              </Button>
            )}
          </div>

          {submitError && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          )}
        </div>

        <BookingSummary
          party={party}
          totals={totals}
          technicianId={technicianId}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />
      </div>
    </div>
  );
}

function BookingConfirmationView({ confirmation }: { confirmation: BookingConfirmation }) {
  const startsAt = new Date(confirmation.startsAt);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(startsAt);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(startsAt);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-offwhite p-6 ring-1 ring-ink/5 sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-ink text-offwhite">
          <Check className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-ink">Appointment requested</h1>
        <p className="mt-2 text-ink-muted">
          Please review your booking details below.
        </p>
      </div>

      <section className="mt-8 rounded-xl bg-background p-5 ring-1 ring-ink/5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Booking summary
        </p>

        <dl className="mt-4 space-y-3 text-sm">
          <SummaryRow label="Name" value={confirmation.customerName} />
          <SummaryRow label="Date" value={dateLabel} />
          <SummaryRow label="Time" value={timeLabel} />
          <SummaryRow label="Technician" value={confirmation.technicianName} />
          <SummaryRow
            label="Duration"
            value={formatDuration(confirmation.durationMinutes)}
          />
        </dl>

        <div className="mt-5 border-t border-ink/8 pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-muted">
            Services
          </p>
          <ul className="mt-3 space-y-3">
            {confirmation.party.map((member) =>
              member.serviceIds.map((id, index) => {
                const service = getServiceById(id);
                if (!service) return null;
                return (
                  <li
                    key={`${member.id}-${id}-${index}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="text-ink">
                      {confirmation.party.length > 1 && (
                        <span className="text-ink-muted">{member.label}: </span>
                      )}
                      {service.name}
                    </span>
                    <span className="shrink-0 font-medium text-ink-muted">
                      {formatPrice(service.price)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-ink/8 pt-4">
          <span className="font-semibold text-ink">Estimated total</span>
          <span className="text-xl font-semibold text-ink">
            {formatPrice(confirmation.estimatedTotal)}
          </span>
        </div>
      </section>

      <p className="mt-6 text-center text-sm text-ink-muted">
        We'll send reminders to the phone number you provided.
      </p>
      <p className="mt-3 text-center text-xs text-ink-muted">
        Reference {confirmation.appointmentId.slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}

function BookingSteps({ step }: { step: Step }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {stepLabels.map((label, index) => {
        const number = (index + 1) as Step;
        const active = step === number;
        const complete = step > number;
        return (
          <li
            key={label}
            className={`rounded-full px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] ${
              active
                ? "bg-ink text-offwhite"
                : complete
                  ? "bg-secondary text-ink"
                  : "bg-offwhite text-ink-muted"
            }`}
          >
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function ServiceStep({
  party,
  setParty,
  highlightedField,
  onFieldEdit,
}: {
  party: PartyMember[];
  setParty: Dispatch<SetStateAction<PartyMember[]>>;
  highlightedField: string | null;
  onFieldEdit: (fieldId: string) => void;
}) {
  return (
    <div>
      <StepHeading
        icon={<Scissors className="size-5" />}
        title="Choose services"
        description="Select one or multiple services. Add a guest if you are booking together."
      />

      <div className="mt-6 space-y-8">
        {party.map((member, memberIndex) => {
          const guestNameFieldId = `booking-guest-name-${member.id}`;
          const servicesFieldId = memberServicesFieldId(member.id);
          const sectionHighlight =
            highlightedField === guestNameFieldId ||
            highlightedField === servicesFieldId;

          return (
          <div
            key={member.id}
            id={servicesFieldId}
            className={cn(
              "rounded-xl bg-background p-4 transition-shadow",
              sectionHighlight && "ring-2 ring-red-500 ring-offset-2 ring-offset-offwhite"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              {memberIndex === 0 ? (
                <h3 className="font-semibold text-ink">You</h3>
              ) : (
                <label className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-ink">
                    Guest name<span className="text-red-700"> *</span>
                  </span>
                  <input
                    id={guestNameFieldId}
                    value={member.label}
                    onChange={(event) => {
                      onFieldEdit(guestNameFieldId);
                      setParty((current) =>
                        current.map((item) =>
                          item.id === member.id
                            ? { ...item, label: event.target.value }
                            : item
                        )
                      );
                    }}
                    placeholder="Type guest name here"
                    className={cn(
                      "mt-2 h-11 w-full rounded-xl border border-input bg-offwhite px-3 text-ink placeholder:text-ink-muted outline-none transition-shadow",
                      highlightedField === guestNameFieldId &&
                        "border-red-500 ring-2 ring-red-500"
                    )}
                  />
                </label>
              )}
              {memberIndex > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
                  onClick={() =>
                    setParty((current) => current.filter((item) => item.id !== member.id))
                  }
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              )}
            </div>

            {highlightedField === servicesFieldId && (
              <p className="mt-3 text-sm font-medium text-red-700">
                Please select at least one service
                {memberIndex > 0 ? ` for ${member.label.trim() || "this guest"}` : ""}.
              </p>
            )}

            <div className="mt-4 space-y-5">
              {serviceCategories.map((category) => (
                <div key={`${member.id}-${category.id}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                    {category.name}
                  </p>
                  <div className="mt-2 grid gap-2">
                    {category.services.map((service) => {
                      const checked = member.serviceIds.includes(service.id);
                      return (
                        <label
                          key={`${member.id}-${service.id}`}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            checked
                              ? "border-ink bg-offwhite"
                              : "border-border bg-offwhite/60 hover:border-ink/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            className="mt-1 size-4 accent-ink"
                            onChange={() => {
                              onFieldEdit(servicesFieldId);
                              setParty((current) =>
                                current.map((item) =>
                                  item.id === member.id
                                    ? {
                                        ...item,
                                        serviceIds: checked
                                          ? item.serviceIds.filter((id) => id !== service.id)
                                          : [...item.serviceIds, service.id],
                                      }
                                    : item
                                )
                              );
                            }}
                          />
                          <span className="flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="font-medium text-ink">{service.name}</span>
                              <span className="text-sm font-semibold text-ink">
                                {formatPrice(service.price)}
                              </span>
                            </span>
                            <span className="mt-1 block text-sm text-ink-muted">
                              {formatDuration(service.durationMinutes)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-5"
        onClick={() =>
          setParty((current) => [
            ...current,
            { id: crypto.randomUUID(), label: "", serviceIds: [] },
          ])
        }
      >
        <Plus className="size-4" />
        Add Guest
      </Button>
    </div>
  );
}

function TechnicianStep({
  technicianId,
  setTechnicianId,
  partySize,
}: {
  technicianId: string;
  setTechnicianId: (id: string) => void;
  partySize: number;
}) {
  return (
    <div>
      <StepHeading
        icon={<UserRound className="size-5" />}
        title="Choose a technician"
        description={
          partySize > 1
            ? 'Each guest needs their own technician at the same time. "Any" shows times when enough staff are free.'
            : 'Pick someone specific or choose "Any" for the most available times.'
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <TechnicianCard
          checked={technicianId === "any"}
          title="Any available technician"
          description="Show the earliest times across the whole team."
          onClick={() => setTechnicianId("any")}
        />
        {technicians.map((technician) => (
          <TechnicianCard
            key={technician.id}
            checked={technicianId === technician.id}
            title={technician.name}
            description={`${technician.role} - ${technician.yearsExperience}+ years`}
            onClick={() => setTechnicianId(technician.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TechnicianCard({
  checked,
  title,
  description,
  onClick,
}: {
  checked: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-xl border p-4 text-left transition-colors ${
        checked ? "border-ink bg-background" : "border-border hover:border-ink/40"
      }`}
      onClick={onClick}
    >
      <span className="font-semibold text-ink">{title}</span>
      <span className="mt-1 block text-sm text-ink-muted">{description}</span>
    </button>
  );
}

function DateTimeStep({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  slots,
  loadingSlots,
  slotError,
  technicianId,
  highlightedField,
  onFieldEdit,
}: {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  slots: BookingSlot[];
  loadingSlots: boolean;
  slotError: string;
  technicianId: string;
  highlightedField: string | null;
  onFieldEdit: (fieldId: string) => void;
}) {
  const timeFieldId = "booking-time-slots";
  const dateOptions = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const iso = toIsoDate(date);
      return { iso, closed: isSalonClosed(iso) };
    });
  }, []);

  const isClosed = isSalonClosed(selectedDate);
  const isToday = selectedDate === toIsoDate(new Date());
  const emptyMessage = isClosed
    ? "We're closed this day. Please choose another date."
    : isToday
      ? "No times left today. Try tomorrow or another open day."
      : 'No times available for this date. Try another day or choose "Any" technician.';

  return (
    <div>
      <StepHeading
        icon={<Calendar className="size-5" />}
        title="Choose date and time"
        description="Times are shown in 15-minute blocks based on your selected services."
      />

      <div className="mt-6">
        <label className="text-sm font-medium text-ink">Calendar</label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {dateOptions.map(({ iso, closed }) => (
            <button
              key={iso}
              type="button"
              disabled={closed}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                closed
                  ? "cursor-not-allowed border-border/60 bg-secondary/50 text-ink-muted opacity-60"
                  : selectedDate === iso
                    ? "border-ink bg-ink text-offwhite"
                    : "border-border bg-background hover:border-ink/40"
              }`}
              onClick={() => !closed && setSelectedDate(iso)}
            >
              <span className="block text-xs uppercase tracking-[0.14em] opacity-70">
                {formatWeekday(iso)}
              </span>
              <span className="mt-1 block font-semibold">{formatMonthDay(iso)}</span>
              {closed && (
                <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide">
                  Closed
                </span>
              )}
            </button>
          ))}
        </div>

        <input
          type="date"
          min={toIsoDate(new Date())}
          value={selectedDate}
          onChange={(event) => {
            const value = event.target.value;
            if (value && !isSalonClosed(value)) setSelectedDate(value);
          }}
          className="mt-4 h-12 w-full rounded-md border border-input bg-background px-4 text-ink outline-none focus:ring-2 focus:ring-ring sm:max-w-xs"
        />
      </div>

      <div
        id={timeFieldId}
        className={cn(
          "mt-8 rounded-xl transition-shadow",
          highlightedField === timeFieldId &&
            "ring-2 ring-red-500 ring-offset-2 ring-offset-offwhite"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-ink">Available times</label>
          {technicianId === "any" && !isClosed && (
            <span className="text-xs text-ink-muted">Shows slots with at least one tech free</span>
          )}
        </div>

        {isClosed && (
          <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-ink-muted">
            {emptyMessage}
          </p>
        )}

        {!isClosed && loadingSlots && (
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="size-4 animate-spin" />
            Checking availability...
          </p>
        )}

        {!isClosed && slotError && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {slotError}
          </p>
        )}

        {!isClosed && !loadingSlots && !slotError && slots.length === 0 && (
          <p className="mt-4 rounded-lg bg-background px-4 py-3 text-sm text-ink-muted">
            {emptyMessage}
          </p>
        )}

        {!isClosed && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                  selectedTime === slot.time
                    ? "border-ink bg-ink text-offwhite"
                    : "border-border bg-background text-ink hover:border-ink/40"
                }`}
                onClick={() => {
                  onFieldEdit(timeFieldId);
                  setSelectedTime(slot.time);
                }}
              >
                {formatTimeLabel(slot.time)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsStep({
  details,
  setDetails,
  highlightedField,
  onFieldEdit,
}: {
  details: { name: string; phone: string; email: string };
  setDetails: Dispatch<SetStateAction<{ name: string; phone: string; email: string }>>;
  highlightedField: string | null;
  onFieldEdit: (fieldId: string) => void;
}) {
  return (
    <div>
      <StepHeading
        icon={<UsersRound className="size-5" />}
        title="Your details"
        description="We will use this to confirm your appointment and send reminders."
      />

      <div className="mt-6 grid gap-4">
        <TextField
          id="booking-details-name"
          label="Name"
          value={details.name}
          onChange={(value) => {
            onFieldEdit("booking-details-name");
            setDetails((current) => ({ ...current, name: value }));
          }}
          autoComplete="name"
          required
          highlighted={highlightedField === "booking-details-name"}
        />
        <TextField
          id="booking-details-phone"
          label="Phone number"
          value={details.phone}
          onChange={(value) => {
            onFieldEdit("booking-details-phone");
            setDetails((current) => ({ ...current, phone: value }));
          }}
          autoComplete="tel"
          required
          highlighted={highlightedField === "booking-details-phone"}
        />
        <TextField
          label="Email (optional)"
          type="email"
          value={details.email}
          onChange={(value) => setDetails((current) => ({ ...current, email: value }))}
          autoComplete="email"
        />
      </div>
    </div>
  );
}

function ConfirmStep({
  party,
  technicianId,
  selectedDate,
  selectedTime,
  details,
  smsConsent,
  setSmsConsent,
}: {
  party: PartyMember[];
  technicianId: string;
  selectedDate: string;
  selectedTime: string;
  details: { name: string; phone: string; email: string };
  smsConsent: boolean;
  setSmsConsent: (value: boolean) => void;
}) {
  const technician =
    technicianId === "any"
      ? "Any available technician"
      : technicians.find((item) => item.id === technicianId)?.name;

  return (
    <div>
      <StepHeading
        icon={<Check className="size-5" />}
        title="Confirm appointment"
        description="Review your selections before creating the appointment."
      />

      <div className="mt-6 space-y-4 rounded-xl bg-background p-5 text-sm">
        <SummaryRow label="Name" value={details.name} />
        <SummaryRow label="Phone" value={details.phone} />
        {details.email && <SummaryRow label="Email" value={details.email} />}
        <SummaryRow label="Technician" value={technician ?? "Any available technician"} />
        <SummaryRow
          label="Date & time"
          value={`${formatReadableDate(selectedDate)} at ${formatTimeLabel(selectedTime)}`}
        />
        <div>
          <span className="font-semibold text-ink">Services</span>
          <div className="mt-2 space-y-2">
            {party.map((member) => (
              <div key={member.id}>
                <p className="font-medium text-ink-soft">{member.label}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-muted">
                  {member.serviceIds.map((id, index) => {
                    const service = getServiceById(id);
                    return <li key={`${member.id}-${id}-${index}`}>{service?.name}</li>;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={smsConsent}
          onChange={(event) => setSmsConsent(event.target.checked)}
          className="mt-1 size-4 accent-ink"
        />
        <span>
          By creating this appointment, you agree to receive automated
          transactional and booking reminder text messages from this merchant.
        </span>
      </label>
    </div>
  );
}

function BookingSummary({
  party,
  totals,
  technicianId,
  selectedDate,
  selectedTime,
}: {
  party: PartyMember[];
  totals: { price: number; duration: number };
  technicianId: string;
  selectedDate: string;
  selectedTime: string;
}) {
  const technician =
    technicianId === "any"
      ? "Any available"
      : technicians.find((item) => item.id === technicianId)?.name || "Any available";

  return (
    <aside className="h-fit rounded-2xl bg-offwhite p-6 ring-1 ring-ink/5 lg:sticky lg:top-28">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
        Appointment Summary
      </p>

      <div className="mt-5 space-y-5">
        <SummaryRow label="Technician" value={technician} />
        <SummaryRow label="Date" value={formatReadableDate(selectedDate)} />
        <SummaryRow label="Time" value={selectedTime ? formatTimeLabel(selectedTime) : "Select"} />
        <SummaryRow label="Duration" value={totals.duration ? formatDuration(totals.duration) : "0 min"} />
        <SummaryRow label="Total" value={formatPrice(totals.price)} />
      </div>

      <div className="mt-6 border-t border-border pt-5">
        {party.map((member) => (
          <div key={member.id} className="mb-4 last:mb-0">
            <p className="font-semibold text-ink">{member.label}</p>
            {member.serviceIds.length === 0 ? (
              <p className="mt-1 text-sm text-ink-muted">No services selected yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                {member.serviceIds.map((id, index) => {
                  const service = getServiceById(id);
                  return <li key={`${member.id}-${id}-${index}`}>{service?.name}</li>;
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function StepHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-offwhite">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-ink-muted">{description}</p>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  highlighted = false,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  highlighted?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className={cn(
          "mt-2 h-12 w-full rounded-md border border-input bg-background px-4 text-ink outline-none transition-shadow focus:ring-2 focus:ring-ring",
          highlighted && "border-red-500 ring-2 ring-red-500"
        )}
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

async function submitBooking({
  party,
  technicianId,
  selectedDate,
  selectedTime,
  details,
  setSubmitting,
  setSubmitError,
  setConfirmation,
}: {
  party: PartyMember[];
  technicianId: string;
  selectedDate: string;
  selectedTime: string;
  details: { name: string; phone: string; email: string };
  setSubmitting: (value: boolean) => void;
  setSubmitError: (value: string) => void;
  setConfirmation: (value: BookingConfirmation) => void;
}) {
  setSubmitting(true);
  setSubmitError("");

  const services = party.flatMap((member) =>
    member.serviceIds
      .map((id) => getServiceById(id))
      .filter((service): service is NonNullable<typeof service> => Boolean(service))
  );
  const estimatedTotal = services.reduce((sum, service) => sum + service.price, 0);
  const durationMinutes = services.reduce((sum, service) => sum + service.durationMinutes, 0);

  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        party,
        technicianId,
        date: selectedDate,
        time: selectedTime,
        customer: details,
        smsConsent: true,
      }),
    });
    const body = (await response.json()) as
      | { error: string }
      | { appointmentId: string; technicianName: string; startsAt: string };

    if (!response.ok || "error" in body) {
      throw new Error("error" in body ? body.error : "Unable to create appointment.");
    }

    setConfirmation({
      ...body,
      customerName: details.name.trim(),
      party,
      estimatedTotal,
      durationMinutes,
    });
  } catch (error) {
    setSubmitError((error as Error).message);
  } finally {
    setSubmitting(false);
  }
}


function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    new Date(`${date}T00:00:00`)
  );
}

function formatMonthDay(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T00:00:00`)
  );
}

function getStepValidationError(
  currentStep: Step,
  {
    party,
    selectedTime,
    details,
  }: {
    party: PartyMember[];
    selectedTime: string;
    details: { name: string; phone: string; email: string };
  }
): string | null {
  if (currentStep === 1) {
    for (let index = 1; index < party.length; index++) {
      const member = party[index];
      if (!member.label.trim()) {
        return `booking-guest-name-${member.id}`;
      }
      if (member.serviceIds.length === 0) {
        return memberServicesFieldId(member.id);
      }
    }

    if (!party[0] || party[0].serviceIds.length === 0) {
      return memberServicesFieldId(party[0]?.id ?? "primary");
    }

    return null;
  }

  if (currentStep === 3 && !selectedTime) {
    return "booking-time-slots";
  }

  if (currentStep === 4) {
    if (!details.name.trim()) return "booking-details-name";
    if (!details.phone.trim()) return "booking-details-phone";
  }

  return null;
}

function memberServicesFieldId(memberId: string) {
  return `booking-member-services-${memberId}`;
}

function scrollToBookingField(fieldId: string) {
  const element = document.getElementById(fieldId);
  if (!element) return;

  element.scrollIntoView({ behavior: "smooth", block: "center" });

  const focusTarget =
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element
      : element.querySelector<HTMLInputElement>("input, textarea");

  focusTarget?.focus({ preventScroll: true });
}

function formatReadableDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTimeLabel(time: string) {
  if (!time) return "Select";
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hour, minute));
}
