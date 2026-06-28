"use client";

import { Copy, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  applySalonHoursToSchedule,
  copyMondayToWeekdays,
  getSalonHoursLabel,
} from "@/lib/technicians/schedule-utils";
import type { TechnicianScheduleInput } from "@/lib/technicians/types";
import { DAY_LABELS } from "@/lib/technicians/types";
import { cn } from "@/lib/utils";

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
  function updateDay(dayOfWeek: number, patch: Partial<TechnicianScheduleInput>) {
    onChange(
      schedule.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day))
    );
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onChange(copyMondayToWeekdays(schedule))}
        >
          <Copy className="size-4" />
          Copy Mon → Weekdays
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onChange(applySalonHoursToSchedule())}
        >
          Apply salon hours
        </Button>
      </div>

      <div className="space-y-2">
        {schedule.map((day) => {
          const salonHint = getSalonHoursLabel(day.dayOfWeek);
          const salonClosed = salonHint === "Closed";

          return (
            <div
              key={day.dayOfWeek}
              className={cn(
                "grid gap-3 rounded-2xl bg-background px-4 py-3",
                "sm:grid-cols-[7rem_6rem_1fr_1fr_auto] sm:items-center"
              )}
            >
              <p className="font-semibold text-ink">{DAY_LABELS[day.dayOfWeek]}</p>

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

              <label className="block text-sm">
                <span className="mb-1 block text-ink-muted sm:sr-only">Start</span>
                <input
                  type="time"
                  value={day.startTime ?? ""}
                  disabled={disabled || !day.isWorking || salonClosed}
                  onChange={(event) =>
                    updateDay(day.dayOfWeek, { startTime: event.target.value || null })
                  }
                  className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-3 text-ink disabled:opacity-50"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-ink-muted sm:sr-only">End</span>
                <input
                  type="time"
                  value={day.endTime ?? ""}
                  disabled={disabled || !day.isWorking || salonClosed}
                  onChange={(event) =>
                    updateDay(day.dayOfWeek, { endTime: event.target.value || null })
                  }
                  className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-3 text-ink disabled:opacity-50"
                />
              </label>

              <p className="text-xs text-ink-muted sm:text-right">
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
