import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-7xl font-bold tracking-tight bg-gradient-to-br from-primary to-primary/40 bg-clip-text text-transparent">
        404
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground max-w-sm">
        We couldn&apos;t find that screen. It may have moved, or it might not exist yet — much of
        the ERP Mini app is still being built.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
        <Link href="/dashboard" className={buttonVariants()}>
          Open the app
        </Link>
      </div>
    </div>
  );
}
