"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PADDING_ROWS = Math.floor(VISIBLE_ROWS / 2);

interface TimeWheelPickerProps {
  value: string;
  onChange: (time: string) => void;
  /** Earliest selectable time (24h "HH:mm"). */
  minTime?: string;
  /** Latest selectable time (24h "HH:mm"). */
  maxTime?: string;
  stepMinutes?: number;
  className?: string;
}

export function TimeWheelPicker({
  value,
  onChange,
  minTime = "08:00",
  maxTime = "20:00",
  stepMinutes = 15,
  className,
}: TimeWheelPickerProps) {
  const { effectiveMin, effectiveMax } = useMemo(
    () => normalizeRange(minTime, maxTime),
    [minTime, maxTime]
  );

  const times = useMemo(
    () => generateTimeOptions(effectiveMin, effectiveMax, stepMinutes),
    [effectiveMin, effectiveMax, stepMinutes]
  );

  const parsed = parseTime24(value);
  const hour12 = toHour12(parsed.hour);
  const ampm = parsed.hour >= 12 ? "PM" : "AM";

  const hours = useMemo(() => {
    const set = new Set<number>();
    for (const t of times) {
      set.add(toHour12(parseInt(t.split(":")[0], 10)));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [times]);

  const minutesForHour = useCallback(
    (h12: number, period: "AM" | "PM") => {
      const matching = times.filter((t) => {
        const p = parseTime24(t);
        return toHour12(p.hour) === h12 && (p.hour >= 12 ? "PM" : "AM") === period;
      });
      return matching.map((t) => parseTime24(t).minute);
    },
    [times]
  );

  const [selectedHour, setSelectedHour] = useState(hour12);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedAmpm, setSelectedAmpm] = useState<"AM" | "PM">(ampm);

  const availableMinutes = useMemo(
    () => minutesForHour(selectedHour, selectedAmpm),
    [minutesForHour, selectedHour, selectedAmpm]
  );

  useEffect(() => {
    const h12 = toHour12(parsed.hour);
    const p = parsed.hour >= 12 ? "PM" : "AM";
    setSelectedHour(h12);
    setSelectedMinute(parsed.minute);
    setSelectedAmpm(p);
  }, [value, parsed.hour, parsed.minute]);

  useEffect(() => {
    if (!availableMinutes.includes(selectedMinute)) {
      setSelectedMinute(availableMinutes[0] ?? 0);
    }
  }, [availableMinutes, selectedMinute]);

  useEffect(() => {
    const hour24 = toHour24(selectedHour, selectedAmpm);
    const next = `${String(hour24).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;
    if (times.includes(next) && next !== value) {
      onChange(next);
    }
  }, [selectedHour, selectedMinute, selectedAmpm, times, value, onChange]);

  const ampmOptions: ("AM" | "PM")[] = useMemo(() => {
    const opts: ("AM" | "PM")[] = [];
    if (times.some((t) => parseInt(t.split(":")[0], 10) < 12)) opts.push("AM");
    if (times.some((t) => parseInt(t.split(":")[0], 10) >= 12)) opts.push("PM");
    return opts.length > 0 ? opts : ["AM", "PM"];
  }, [times]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-background ring-1 ring-ink/10",
        className
      )}
    >
      {times.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted">
          No times available in this range.
        </p>
      ) : (
        <>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-11 -translate-y-1/2 rounded-lg bg-ink/[0.06] ring-1 ring-ink/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-background to-transparent" />

      <div className="grid grid-cols-3 divide-x divide-ink/8">
        <WheelColumn
          items={hours.map(String)}
          selected={String(selectedHour)}
          onSelect={(v) => setSelectedHour(Number(v))}
          formatLabel={(v) => v}
        />
        <WheelColumn
          items={availableMinutes.map((m) => String(m).padStart(2, "0"))}
          selected={String(selectedMinute).padStart(2, "0")}
          onSelect={(v) => setSelectedMinute(Number(v))}
          formatLabel={(v) => v}
        />
        <WheelColumn
          items={ampmOptions}
          selected={selectedAmpm}
          onSelect={(v) => setSelectedAmpm(v as "AM" | "PM")}
          formatLabel={(v) => v}
        />
      </div>
        </>
      )}
    </div>
  );
}

function WheelColumn({
  items,
  selected,
  onSelect,
  formatLabel,
}: {
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
  formatLabel: (value: string) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const paddedItems = useMemo(
    () => [...Array(PADDING_ROWS).fill(""), ...items, ...Array(PADDING_ROWS).fill("")],
    [items]
  );

  const scrollToIndex = useCallback(
    (index: number, smooth = false) => {
      const el = ref.current;
      if (!el) return;
      el.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? "smooth" : "auto" });
    },
    []
  );

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) scrollToIndex(idx);
  }, [items, selected, scrollToIndex]);

  function handleScroll() {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const el = ref.current;
      if (!el || items.length === 0) return;
      const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
      const index = Math.max(0, Math.min(items.length - 1, rawIndex));
      scrollToIndex(index, true);
      onSelect(items[index]);
    }, 80);
  }

  return (
    <div
      ref={ref}
      className="h-[220px] overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ scrollSnapType: "y mandatory" }}
      onScroll={handleScroll}
    >
      {paddedItems.map((item, index) => (
        <button
          key={`${item}-${index}`}
          type="button"
          disabled={!item}
          onClick={() => {
            if (!item) return;
            const idx = items.indexOf(item);
            if (idx >= 0) {
              scrollToIndex(idx, true);
              onSelect(item);
            }
          }}
          className={cn(
            "flex h-11 w-full items-center justify-center text-lg font-semibold transition-colors",
            item === selected ? "text-ink" : item ? "text-ink-muted/50" : "invisible",
            item && "hover:text-ink"
          )}
          style={{ scrollSnapAlign: "center" }}
        >
          {item ? formatLabel(item) : ""}
        </button>
      ))}
    </div>
  );
}

function generateTimeOptions(minTime: string, maxTime: string, step: number): string[] {
  const options: string[] = [];
  const start = parseTime24(minTime);
  const end = parseTime24(maxTime);
  let cursor = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (cursor > endMinutes) {
    return [`${String(end.hour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`];
  }

  while (cursor <= endMinutes) {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cursor += step;
  }

  return options;
}

function normalizeRange(minTime: string, maxTime: string) {
  if (minTime <= maxTime) {
    return { effectiveMin: minTime, effectiveMax: maxTime };
  }
  return { effectiveMin: maxTime, effectiveMax: maxTime };
}

function parseTime24(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

function toHour12(hour24: number) {
  const h = hour24 % 12;
  return h === 0 ? 12 : h;
}

function toHour24(hour12: number, ampm: "AM" | "PM") {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}
