"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function MarkAllReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function markAllRead() {
    startTransition(async () => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" onClick={markAllRead} disabled={isPending} className="px-3 py-2 min-h-0 text-[13px]">
      {isPending ? "Marking\u2026" : "Mark all read"}
    </Button>
  );
}
