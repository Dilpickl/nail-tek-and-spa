"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  applySalonHoursToSchedule,
  copyMondayToWeekdays,
  getSalonHoursLabel,
} from "@/lib/technicians/schedule-utils";
import type { TechnicianScheduleInput } from "@/lib/technicians/types";
import { DAY_LABELS } from "@/lib/technicians/types";

interface EmployeeScheduleEditorProps {
  schedule: TechnicianScheduleInput[];
  onChange: (schedule: TechnicianScheduleInput[]) => void;
  disabled?: boolean;
}

export function EmployeeScheduleEditor({
  schedule,
  onChange,
  disabled = false,
}: EmployeeScheduleEditorProps) {
  const [draftHint, setDraftHint] = useState("");

  function updateDay(dayOfWeek: number, patch: Partial<TechnicianScheduleInput>) {
    onChange(
      schedule.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day))
    );
    setDraftHint("Click Save schedule to apply these changes.");
  }

  function toggleWorking(dayOfWeek: number, isWorking: boolean) {
    const salonLabel = getSalonHoursLabel(dayOfWeek);
    const [startTime, endTime] = salonLabel.includes("–")
      ? salonLabel.split("–")
      : [null, null];

    updateDay(dayOfWeek, {
      isWorking,
      startTime: isWorking ? startTime : null,
      endTime: isWorking ? endTime : null,
    });
  }

  function applyQuickSetup(nextSchedule: TechnicianScheduleInput[], hint: string) {
    onChange(nextSchedule);
    setDraftHint(hint);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-secondary/40 p-4">
        <p className="text-sm font-semibold text-ink">Quick weekly setup</p>
        <p className="mt-1 text-sm text-ink-muted">
          These shortcuts update the draft below. Save schedule when you are done.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() =>
              applyQuickSetup(
                applySalonHoursToSchedule(),
                "Salon default hours applied — click Save schedule to apply."
              )
            }
          >
            Reset to salon default hours
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() =>
              applyQuickSetup(
                copyMondayToWeekdays(schedule),
                "Monday copied to Tue–Fri — click Save schedule to apply."
              )
            }
          >
            <Copy className="size-4" />
            Copy Mon → Weekdays
          </Button>
        </div>
        {draftHint && (
          <p className="mt-3 text-sm font-medium text-amber-900">{draftHint}</p>
        )}
      </div>

      <div className="space-y-2">
        {schedule.map((day) => {
          const salonHint = getSalonHoursLabel(day.dayOfWeek);
          const salonClosed = salonHint === "Closed";

          return (
            <div
              key={day.dayOfWeek}
              className="grid gap-3 rounded-2xl bg-background px-3 py-3 sm:px-4 xl:grid-cols-[7rem_6rem_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-center"
            >
              <div className="flex items-center justify-between gap-3 xl:block">
                <p className="font-semibold text-ink">{DAY_LABELS[day.dayOfWeek]}</p>
                <p className="text-xs text-ink-muted xl:mt-1 xl:hidden">
                  Salon: {salonHint}
                </p>
              </div>

              <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={day.isWorking}
                  disabled={disabled || salonClosed}
                  onChange={(event) => toggleWorking(day.dayOfWeek, event.target.checked)}
                  className="size-4 rounded border-ink/20"
                />
                {day.isWorking ? "Working" : "Off"}
              </label>

              <label className="block min-w-0 text-sm">
                <span className="mb-1 block text-ink-muted xl:sr-only">Start</span>
                <input
                  type="time"
                  value={day.startTime ?? ""}
                  disabled={disabled || !day.isWorking || salonClosed}
                  onChange={(event) =>
                    updateDay(day.dayOfWeek, { startTime: event.target.value || null })
                  }
                  className="h-11 w-full min-w-0 rounded-xl border border-ink/15 bg-offwhite px-2 text-ink disabled:opacity-50 sm:px-3"
                />
              </label>

              <label className="block min-w-0 text-sm">
                <span className="mb-1 block text-ink-muted xl:sr-only">End</span>
                <input
                  type="time"
                  value={day.endTime ?? ""}
                  disabled={disabled || !day.isWorking || salonClosed}
                  onChange={(event) =>
                    updateDay(day.dayOfWeek, { endTime: event.target.value || null })
                  }
                  className="h-11 w-full min-w-0 rounded-xl border border-ink/15 bg-offwhite px-2 text-ink disabled:opacity-50 sm:px-3"
                />
              </label>

              <p className="hidden text-xs text-ink-muted xl:block xl:text-right">
                Salon: {salonHint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleSavingIndicator({ saving }: { saving: boolean }) {
  if (!saving) return null;
  return (
    <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <Loader2 className="size-4 animate-spin" />
      Saving schedule…
    </p>
  );
}
