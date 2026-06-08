export const TAG_COLORS = [
  "slate",
  "red",
  "amber",
  "emerald",
  "sky",
  "violet",
  "rose",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_CLASS: Record<TagColor, string> = {
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  red: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export const TAG_SWATCH_CLASS: Record<TagColor, string> = {
  slate: "bg-slate-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
};

export function safeTagColor(color: string | null | undefined): TagColor {
  return (TAG_COLORS as readonly string[]).includes(color ?? "")
    ? (color as TagColor)
    : "slate";
}
