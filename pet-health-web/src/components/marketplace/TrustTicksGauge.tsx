"use client";

import { trustTickColor } from "@/lib/breederTrust";

type Props = {
  score: number;
  /** Center caption under the number */
  caption: string;
  size?: number;
  className?: string;
  /** Override tick coloring (defaults to transparency trust bands). */
  tickColor?: (tickIndex: number, score: number) => string;
};

/**
 * 100 radial ticks gauge — active ticks (≤ score) use band colors;
 * inactive ticks are light gray.
 */
export function TrustTicksGauge({
  score,
  caption,
  size = 220,
  className = "",
  tickColor = trustTickColor,
}: Props) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.32;
  const labelR = size * 0.47;

  const ticks = Array.from({ length: 100 }, (_, i) => {
    const tick = i + 1;
    const angleDeg = (tick / 100) * 360 - 90; // 0 at top, clockwise
    const rad = (angleDeg * Math.PI) / 180;
    const x1 = cx + Math.cos(rad) * innerR;
    const y1 = cy + Math.sin(rad) * innerR;
    const x2 = cx + Math.cos(rad) * outerR;
    const y2 = cy + Math.sin(rad) * outerR;
    return (
      <line
        key={tick}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={tickColor(tick, s)}
        strokeWidth={size * 0.008}
        strokeLinecap="round"
      />
    );
  });

  const markers = [0, 20, 40, 60, 80].map((m) => {
    const angleDeg = (m / 100) * 360 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx + Math.cos(rad) * labelR;
    const y = cy + Math.sin(rad) * labelR;
    return (
      <text
        key={m}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-400"
        fontSize={size * 0.045}
        fontWeight={500}
      >
        {m}
      </text>
    );
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${s}/100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {ticks}
        {markers}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-bold text-slate-900 leading-none tabular-nums">
          {s}
        </span>
        <span className="mt-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wide text-slate-500 uppercase text-center max-w-[7.5rem] leading-tight">
          {caption}
        </span>
      </div>
    </div>
  );
}
