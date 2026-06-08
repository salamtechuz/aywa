import { cn } from "@/lib/utils";
import { TAG_COLOR_CLASS, safeTagColor } from "@/lib/crm/tags";

type Props = {
  name: string;
  color: string;
  className?: string;
  size?: "xs" | "sm";
};

export function TagChip({ name, color, className, size = "xs" }: Props) {
  const c = safeTagColor(color);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "xs" ? "text-[10px] px-1.5 py-0" : "text-[11px] px-2 py-0.5",
        TAG_COLOR_CLASS[c],
        className,
      )}
    >
      {name}
    </span>
  );
}
