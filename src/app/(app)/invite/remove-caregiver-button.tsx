"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function RemoveCaregiverButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function remove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/care-recipients/caregivers/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't remove access.");
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <Button
        variant={confirming ? "danger" : "ghost"}
        onClick={remove}
        disabled={isPending}
        className="px-3 py-2 min-h-0"
      >
        {isPending ? "Removing…" : confirming ? "Confirm remove" : "Remove"}
      </Button>
      {error && <p className="text-[12px] text-brick">{error}</p>}
    </div>
  );
}
