"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where you'd forward to an error-tracking
    // service (Sentry, etc). Kept as a console log for now.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-soft">
        That's on us, not you. Try again, or head back to your dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line px-5 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-paper-dim"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
