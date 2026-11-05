import type { CSSProperties, ElementType } from "react";

import { cn } from "@/lib/utils";

export interface TitlePart {
  text: string;
  /** Rose italic phrase that "paints" on after the rest of the title. */
  accent?: boolean;
}

const RISE_STEP_MS = 65;
const PAINT_STEP_MS = 260;

/**
 * Title whose plain words rise in one by one; accent words paint on
 * afterwards. `play="load"` animates immediately (hero); `play="scroll"`
 * waits until <MotionObserver> marks it shown.
 */
export function AnimatedTitle({
  as: Tag = "h2",
  parts,
  play = "scroll",
  startMs = 0,
  paintGapMs = 650,
  className,
  id,
}: {
  as?: ElementType;
  parts: TitlePart[];
  play?: "load" | "scroll";
  startMs?: number;
  paintGapMs?: number;
  className?: string;
  id?: string;
}) {
  const plainWordCount = parts
    .filter((part) => !part.accent)
    .reduce((count, part) => count + part.text.trim().split(/\s+/).length, 0);
  const paintStart = startMs + plainWordCount * RISE_STEP_MS + paintGapMs;

  let plainIndex = 0;
  let paintIndex = 0;

  const label = parts.map((part) => part.text.trim()).join(" ");

  return (
    <Tag id={id} className={cn("nt-title", className)} data-play={play} aria-label={label}>
      {parts.map((part, partIndex) => {
        const words = part.text.trim().split(/\s+/);
        const rendered = words.map((word, wordIndex) => {
          const delay = part.accent
            ? paintStart + paintIndex++ * PAINT_STEP_MS
            : startMs + plainIndex++ * RISE_STEP_MS;
          return (
            <span key={wordIndex}>
              <span
                aria-hidden
                className={cn("w", part.accent && "paint")}
                style={{ "--d": `${delay}ms` } as CSSProperties}
              >
                <span>{word}</span>
              </span>
              {wordIndex < words.length - 1 ? " " : null}
            </span>
          );
        });
        return (
          <span key={partIndex}>
            {partIndex > 0 ? " " : null}
            {part.accent ? <i className="font-normal text-rose">{rendered}</i> : rendered}
          </span>
        );
      })}
    </Tag>
  );
}
