import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /**
   * `mark`     — square SVG emblem (three ribbon-bars). Use for sidebar /
   *              favicon / dense UI. Sizes to its wrapper (defaults to 1.5rem).
   * `wordmark` — emblem + "aywa" lockup as crisp SVG + text (no raster).
   *              Use for marketing surfaces — landing header, sign-in, splash.
   *              Scales with the wrapper's font-size.
   */
  variant?: "mark" | "wordmark";
  /**
   * Adds the multi-stop red gradient + soft shadow to the SVG emblem.
   */
  gradient?: boolean;
};

const GRAD_ID = "aywa-logo-grad";
const SHADOW_ID = "aywa-logo-shadow";

function Defs({ width, height }: { width: number; height: number }) {
  return (
    <defs>
      <linearGradient
        id={GRAD_ID}
        x1="0"
        y1="0"
        x2={width}
        y2={height}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="oklch(0.74 0.21 30)" />
        <stop offset="32%" stopColor="oklch(0.63 0.24 22)" />
        <stop offset="68%" stopColor="oklch(0.52 0.23 18)" />
        <stop offset="100%" stopColor="oklch(0.40 0.18 14)" />
      </linearGradient>
      <filter id={SHADOW_ID} x="-15%" y="-15%" width="130%" height="135%">
        <feDropShadow
          dx="0"
          dy="0.8"
          stdDeviation="0.7"
          floodColor="oklch(0.30 0.18 18)"
          floodOpacity="0.45"
        />
      </filter>
    </defs>
  );
}

// Square mark — three ribbon bars, 2 peaks each.
function SquareMark({
  gradient,
  className,
}: {
  gradient: boolean;
  className?: string;
}) {
  const fill = gradient ? `url(#${GRAD_ID})` : "currentColor";
  return (
    <svg
      viewBox="0 0 36 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("h-full w-full", className)}
    >
      {gradient && <Defs width={36} height={30} />}
      <g fill={fill} filter={gradient ? `url(#${SHADOW_ID})` : undefined}>
        <path d="M0 5 L9 0 L18 5 L27 0 L36 5 L36 10 L27 5 L18 10 L9 5 L0 10 Z" />
        <path d="M0 15 L9 10 L18 15 L27 10 L36 15 L36 20 L27 15 L18 20 L9 15 L0 20 Z" />
        <path d="M0 25 L9 20 L18 25 L27 20 L36 25 L36 30 L27 25 L18 30 L9 25 L0 30 Z" />
      </g>
    </svg>
  );
}

export function Logo({ className, variant = "mark", gradient = false }: LogoProps) {
  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 select-none text-base font-semibold tracking-tight",
          className,
        )}
      >
        <span className="inline-flex h-[1.4em] items-center text-red-600 dark:text-red-500">
          <SquareMark gradient={gradient} className="w-auto" />
        </span>
        <span className="leading-none lowercase">aywa</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center text-red-600 dark:text-red-500",
        className,
      )}
    >
      <SquareMark gradient={gradient} />
    </span>
  );
}
