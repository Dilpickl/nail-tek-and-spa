"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TechnicianScheduleOverrideRow } from "@/lib/technicians/types";
import { cn } from "@/lib/utils";

interface EmployeeScheduleExceptionsProps {
  employeeId: string;
  disabled?: boolean;
}

export function EmployeeScheduleExceptions({
  employeeId,
  disabled = false,
}: EmployeeScheduleExceptionsProps) {
  const [overrides, setOverrides] = useState<TechnicianScheduleOverrideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [exceptionType, setExceptionType] = useState<"off" | "custom">("off");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");

  const loadOverrides = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/employees/${employeeId}/overrides`);
      const body = (await response.json()) as {
        overrides?: TechnicianScheduleOverrideRow[];
        error?: string;
      };

      if (!response.ok) throw new Error(body.error || "Unable to load schedule exceptions.");

      setOverrides(body.overrides ?? []);
    } catch (err) {
      setError((err as Error).message);
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadOverrides();
  }, [loadOverrides]);

  async function addException() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/employees/${employeeId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideDate,
          isWorking: exceptionType === "custom",
          startTime: exceptionType === "custom" ? startTime : null,
          endTime: exceptionType === "custom" ? endTime : null,
          reason: reason.trim() || null,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to save exception.");

      setOverrideDate("");
      setReason("");
      await loadOverrides();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeException(overrideId: string) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/employees/${employeeId}/overrides?overrideId=${overrideId}`,
        { method: "DELETE" }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to remove exception.");

      await loadOverrides();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function formatOverrideLabel(override: TechnicianScheduleOverrideRow) {
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(`${override.override_date}T12:00:00`));

    if (!override.is_working) {
      return `${dateLabel} — Day off`;
    }

    const start = override.start_time?.slice(0, 5) ?? "";
    const end = override.end_time?.slice(0, 5) ?? "";
    return `${dateLabel} — Custom hours ${start}–${end}`;
  }

  return (
    <div className="space-y-4 rounded-2xl bg-background p-4 ring-1 ring-ink/5">
      <div>
        <h3 className="text-lg font-semibold text-ink">Schedule exceptions</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Plan days off or custom hours ahead of time. These override the weekly schedule for
          specific dates only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-ink">Date</span>
          <input
            type="date"
            value={overrideDate}
            disabled={disabled || saving}
            onChange={(event) => setOverrideDate(event.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-3 text-ink"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-ink">Type</span>
          <select
            value={exceptionType}
            disabled={disabled || saving}
            onChange={(event) => setExceptionType(event.target.value as "off" | "custom")}
            className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-3 text-ink"
          >
            <option value="off">Full day off</option>
            <option value="custom">Custom hours</option>
          </select>
        </label>
      </div>

      {exceptionType === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-ink">Start</span>
            <input
              type="time"
              value={startTime}
              disabled={disabled || saving}
              onChange={(event) => setStartTime(event.target.value)}
              className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-3 text-ink"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-ink">End</span>
            <input
              type="time"
              value={endTime}
              disabled={disabled || saving}
              onChange={(event) => setEndTime(event.target.value)}
              className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-3 text-ink"
            />
          </label>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-2 block font-medium text-ink">Reason (optional)</span>
        <input
          value={reason}
          disabled={disabled || saving}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Vacation, appointment, etc."
          className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-3 text-ink"
        />
      </label>

      <Button
        type="button"
        disabled={disabled || saving || !overrideDate}
        onClick={addException}
      >
        {saving ? "Saving…" : "Add exception"}
      </Button>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div>
        <p className="text-sm font-medium text-ink">Upcoming exceptions</p>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </p>
        ) : overrides.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No upcoming exceptions scheduled.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {overrides.map((override) => (
              <li
                key={override.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-ink/10 px-3 py-2.5 text-sm"
                )}
              >
                <span className="flex items-center gap-2 text-ink">
                  <CalendarOff className="size-4 shrink-0 text-ink-muted" />
                  <span>
                    {formatOverrideLabel(override)}
                    {override.reason ? (
                      <span className="block text-xs text-ink-muted">{override.reason}</span>
                    ) : null}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={disabled || saving}
                  onClick={() => removeException(override.id)}
                  className="inline-flex items-center gap-1 text-ink-muted hover:text-ink"
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
