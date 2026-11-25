/**
 * Holiday decorations. Everything here renders on every page but stays hidden
 * unless <html data-holiday> is set, which the inline script in app/layout.tsx
 * does from Nov 1 through Jan 31 (visitor's local date). Static pages need no
 * rebuild to switch on or off.
 */

const BULB_COLORS = ["#D9342B", "#E8B23A", "#2E9B5E", "#3C7DD9"];
const SEGMENTS = 16; // 16 × 160px covers screens up to 2560px wide

/** Twinkling string lights that hang just below the header. */
export function HolidayLights() {
  const bulbs = Array.from({ length: SEGMENTS * 3 }, (_, i) => {
    const pos = i % 3; // 0, 1, 2 → left, middle, right of a swag
    return {
      x: Math.floor(i / 3) * 160 + 40 + pos * 40,
      y: pos === 1 ? 13 : 10.75,
      color: BULB_COLORS[i % BULB_COLORS.length],
    };
  });
  const wire = Array.from({ length: SEGMENTS }, (_, i) => `Q${i * 160 + 80} 22 ${i * 160 + 160} 4`).join(" ");

  return (
    <div aria-hidden className="holiday-only pointer-events-none absolute inset-x-0 top-full -mt-1.5 h-[34px] overflow-hidden">
      <svg width={SEGMENTS * 160} height="34" viewBox={`0 0 ${SEGMENTS * 160} 34`}>
        <path d={`M0 4 ${wire}`} fill="none" stroke="#3A3A36" strokeWidth="1.4" />
        {bulbs.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y})`}>
            <rect x="-2.2" y="-1" width="4.4" height="4.5" rx="1" fill="#3A3A36" />
            <ellipse
              cx="0"
              cy="9"
              rx="3.8"
              ry="6.2"
              fill={b.color}
              className="holiday-twinkle"
              style={{ filter: `drop-shadow(0 0 4px ${b.color})`, animationDelay: `${-(i % 3) * 0.9}s` }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

// [left %, size px, fall seconds, delay seconds]
const FLAKES: [number, number, number, number][] = [
  [2, 16, 18, 2], [12, 12, 22, 11], [18, 16, 19, 16], [23, 20, 16, 6], [33, 14, 20, 15],
  [37, 18, 17, 9], [44, 12, 24, 3], [51, 22, 19, 13], [58, 14, 21, 7], [65, 16, 15, 1],
  [72, 12, 23, 17], [78, 20, 18, 10], [81, 14, 25, 20], [85, 14, 20, 4], [91, 18, 16, 12], [97, 12, 22, 8],
];

/** Slow-falling snowflakes over a `relative overflow-hidden` parent. */
export function Snowfall() {
  return (
    <div aria-hidden className="holiday-only pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {FLAKES.map(([left, size, dur, delay], i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          className="holiday-flake absolute top-0"
          style={{ left: `${left}%`, animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}
          fill="none"
          stroke="#AFBDCC"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M12 1v22M2.5 6.5l19 11M2.5 17.5l19-11" />
          <path d="M9.5 3l2.5 2.5L14.5 3M9.5 21l2.5-2.5 2.5 2.5M3 9.5l3.3-.9-.9-3.3M21 14.5l-3.3.9.9 3.3M3 14.5l3.3.9-.9 3.3M21 9.5l-3.3-.9.9-3.3" />
        </svg>
      ))}
    </div>
  );
}

const Berries = ({ x, y }: { x: string; y: string }) => (
  <svg x={x} y={y} overflow="visible">
    <g fill="#C0272D">
      <circle cx="-2.5" cy="-1" r="2.7" />
      <circle cx="2.5" cy="-1.5" r="2.7" />
      <circle cx="0" cy="2.6" r="2.5" />
    </g>
  </svg>
);

const GOLD_DOTS: [string, string][] = [
  ["25%", "0"], ["75%", "0"], ["25%", "100%"], ["50%", "100%"], ["75%", "100%"], ["0", "50%"], ["100%", "50%"],
];

/**
 * Evergreen wreath frame with berries, gold lights and a bow.
 * Drop inside a `relative` button; it sits 4px outside the button's edge and
 * doesn't change layout.
 */
export function WreathFrame() {
  const ring = { x: "0", y: "0", width: "100%", height: "100%", rx: 10, fill: "none" } as const;
  return (
    <svg aria-hidden className="holiday-only pointer-events-none absolute -left-1 -top-1 h-[calc(100%+8px)] w-[calc(100%+8px)] overflow-visible">
      <rect {...ring} stroke="#1E3D26" strokeWidth="11" strokeLinecap="round" strokeDasharray="1.5 3" />
      <rect {...ring} stroke="#2F5D3A" strokeWidth="8" />
      <rect {...ring} stroke="#3E7A4B" strokeWidth="6" strokeLinecap="round" strokeDasharray="3 4" />
      <rect {...ring} stroke="#5C9A66" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 7" />
      <Berries x="0" y="0" />
      <Berries x="100%" y="0" />
      <Berries x="0" y="100%" />
      <Berries x="100%" y="100%" />
      {GOLD_DOTS.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="2"
          fill="#F0B840"
          className="holiday-twinkle"
          style={{ filter: "drop-shadow(0 0 3px rgba(242,190,80,.95))", animationDelay: `${-(i % 3) * 0.9}s` }}
        />
      ))}
      <svg x="50%" y="0" overflow="visible">
        <path d="M0 0 C-12 -11 -21 -3 -15 6 C-11 10 -4 4 0 0Z M0 0 C12 -11 21 -3 15 6 C11 10 4 4 0 0Z" fill="#C0272D" />
        <path d="M-2 2 L-9 17 L-4.5 15 L-2.5 18 L1 3Z M2 2 L9 17 L4.5 15 L2.5 18 L-1 3Z" fill="#A61F25" />
        <circle r="3.8" fill="#8E1A1F" />
      </svg>
    </svg>
  );
}
