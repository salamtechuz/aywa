import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  bullets?: string[];
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bullets,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed bg-card/50 px-6 py-16",
        className,
      )}
    >
      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md">{description}</p>
      )}
      {bullets && bullets.length > 0 && (
        <ul className="mt-5 grid gap-1.5 text-sm text-left text-muted-foreground max-w-md">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
