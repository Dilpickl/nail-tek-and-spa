"use client";

import type { DateRangePreset } from "@/lib/analytics/date-ranges";
import { cn } from "@/lib/utils";

const PRIMARY_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

const EXTENDED_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "yesterday", label: "Yesterday" },
  { value: "last_week", label: "Last Week" },
  { value: "last_month", label: "Last Month" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "custom", label: "Custom" },
];

interface AnalyticsDatePickerProps {
  preset: DateRangePreset;
  customFrom: string;
  customTo: string;
  showExtended: boolean;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

export function AnalyticsDatePicker({
  preset,
  customFrom,
  customTo,
  showExtended,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: AnalyticsDatePickerProps) {
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full bg-offwhite p-1 ring-1 ring-ink/8">
        {PRIMARY_PRESETS.map((option) => (
          <PresetButton
            key={option.value}
            active={preset === option.value}
            label={option.label}
            onClick={() => onPresetChange(option.value)}
          />
        ))}
      </div>

      {showExtended && (
        <div className="rounded-2xl bg-background/60 px-4 py-3 ring-1 ring-ink/5">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink-muted">
            More date ranges
          </p>
          <div className="flex flex-wrap gap-2">
            {EXTENDED_PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPresetChange(option.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  preset === option.value
                    ? "bg-secondary text-ink ring-1 ring-ink/15"
                    : "text-ink-muted hover:bg-offwhite hover:text-ink"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">From</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => onCustomFromChange(e.target.value)}
                  className="mt-1 h-11 rounded-xl border border-input bg-offwhite px-3 text-ink"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">To</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => onCustomToChange(e.target.value)}
                  className="mt-1 h-11 rounded-xl border border-input bg-offwhite px-3 text-ink"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {!showExtended && (
        <p className="text-xs text-ink-muted">
          Open Full Report below for more date ranges.
        </p>
      )}
    </div>
  );
}

function PresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full px-5 text-sm font-semibold transition-all",
        active ? "bg-ink text-offwhite shadow-sm" : "text-ink-muted hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
