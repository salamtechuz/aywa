"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";

type DetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: DetailDrawerProps) {
  // On phones the drawer slides up from the bottom and fills 90vh — a more
  // native pattern than a right-side slide that gets cropped on narrow screens.
  // On tablets+ it stays as a right-side panel capped at max-w-xl.
  const isMobile = useMediaQuery("(max-width: 640px)");
  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          isMobile
            ? "h-[92vh] w-full max-w-none flex flex-col gap-0 p-0 rounded-t-xl border-t"
            : "w-full sm:max-w-xl flex flex-col gap-0 p-0"
        }
      >
        {isMobile && (
          <div
            aria-hidden
            className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30"
          />
        )}
        <SheetHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b">
          <SheetTitle className="pr-8 sm:pr-0">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {children}
        </div>
        {footer && (
          <SheetFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
