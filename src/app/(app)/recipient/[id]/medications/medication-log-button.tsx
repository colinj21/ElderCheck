"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function MedicationLogButton({
  medicationId,
  latestLogId,
}: {
  medicationId: string;
  latestLogId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function logDose() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/medications/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't log this.");
        return;
      }
      router.refresh();
    });
  }

  function undoLog() {
    if (!latestLogId) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/medications/log/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: latestLogId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't undo this.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {latestLogId ? (
        <Button
          variant="secondary"
          className="px-3 py-2 min-h-0 text-[13px]"
          onClick={undoLog}
          disabled={isPending}
        >
          {isPending ? "…" : "Undo"}
        </Button>
      ) : (
        <Button
          className="px-4 py-2 min-h-0 text-[13px]"
          onClick={logDose}
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Mark given"}
        </Button>
      )}
      {error && <p className="max-w-[140px] text-right text-[11px] text-brick">{error}</p>}
    </div>
  );
}
