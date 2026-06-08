import { cn } from "@/lib/utils";

/**
 * Three visually-distinct mini charts for the marketing preview, one per
 * data-heavy module so the tabs don't all look identical:
 *   • Dashboard → column/bar chart   (overview)
 *   • Sales     → area + line chart  (trend over time)
 *   • Reports   → donut + legend     (composition / breakdown)
 *
 * All are pure SVG/CSS (no chart lib) and follow the app's animation rule:
 * VISIBLE by default, growing in only via `@starting-style` (see globals.css),
 * so the data never disappears if an entrance animation fails to run.
 */

const CHART_BOX =
  "rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4";

/** Dashboard — extruded column chart with one highlighted bar. */
export function MiniBars({ data }: { data: number[] }) {
  const hotIndex = data.length - 2;
  return (
    <div className={CHART_BOX}>
      <div className="flex h-28 items-end gap-1.5 sm:h-36">
        {data.map((h, i) => {
          const hot = i === hotIndex;
          return (
            <div
              key={i}
              className="bar-rise group/bar relative flex-1 rounded-t-[3px] will-change-transform"
              style={{ height: `${h}%`, animationDelay: `${i * 40}ms` }}
            >
              <div
                className={cn(
                  "absolute inset-0 rounded-t-[3px] bg-gradient-to-b transition-[filter] duration-300 group-hover/bar:brightness-110",
                  hot
                    ? "from-primary to-primary/65 shadow-[0_0_20px_-2px_var(--primary)]"
                    : "from-primary/55 to-primary/20",
                )}
              />
              <div className="absolute inset-y-0 right-0 w-px rounded-tr-[3px] bg-black/20" />
              <div className="absolute inset-x-0 top-0 h-px rounded-t-[3px] bg-white/45" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Sales — gradient area chart with a drawn line and a highlighted peak dot. */
export function MiniArea({ data }: { data: number[] }) {
  const W = 100;
  const H = 40;
  const n = data.length;
  // Guard n < 2 so we never divide by zero (a single point sits centered).
  const pts = data.map((v, i) => {
    const x = n < 2 ? W / 2 : (i / (n - 1)) * W;
    return [x, H - (v / 100) * H] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const peak = data.indexOf(Math.max(...data));

  return (
    <div className={CHART_BOX}>
      <div className="relative h-28 w-full sm:h-36">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="preview-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#preview-area)" className="area-fill" />
          <path
            d={line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pathLength={100}
            className="line-draw"
          />
        </svg>
        {pts.map(([x, y], i) => (
          <span
            key={i}
            style={{
              left: `${(x / W) * 100}%`,
              top: `${(y / H) * 100}%`,
              animationDelay: `${i * 55 + 250}ms`,
            }}
            className={cn(
              // Centering is handled by .dot-pop's transform (translate -50%);
              // don't add Tailwind -translate utilities or it double-shifts.
              "dot-pop absolute rounded-full",
              i === peak
                ? "h-2.5 w-2.5 bg-primary shadow-[0_0_12px_-1px_var(--primary)] ring-2 ring-primary/25"
                : "h-1.5 w-1.5 bg-primary/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Reports — donut chart with a centered total and a compact legend. */
export function MiniDonut({
  segments,
}: {
  segments: { value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  // Precompute each arc's length + start offset (prefix sum) without mutating
  // a render-scoped variable — n is tiny so the O(n²) slice is fine.
  const arcs = segments.map((s, i) => ({
    ...s,
    len: (s.value / total) * 100,
    off: segments
      .slice(0, i)
      .reduce((sum, x) => sum + (x.value / total) * 100, 0),
  }));

  return (
    <div className={CHART_BOX}>
      <div className="flex h-28 items-center justify-center gap-4 sm:h-36 sm:gap-6">
        <div className="donut-in relative h-24 w-24 shrink-0 will-change-transform sm:h-28 sm:w-28">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity={0.08}
              strokeWidth="4"
            />
            {arcs.map((s, i) => (
              <circle
                key={i}
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={s.color}
                strokeWidth="4"
                pathLength={100}
                strokeDasharray={`${s.len} ${100 - s.len}`}
                strokeDashoffset={-s.off}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-base font-semibold tabular-nums sm:text-lg"
              style={{ textShadow: "0 0 4px var(--card), 0 0 4px var(--card)" }}
            >
              {Math.round(total)}%
            </span>
          </div>
        </div>
        <div className="grid gap-2">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="tabular-nums text-muted-foreground">
                {Math.round((s.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
