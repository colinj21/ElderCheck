"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function AppointmentActions({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateStatus(status: "completed" | "canceled") {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't update this.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="px-3 py-2 min-h-0 text-[12px]"
          onClick={() => updateStatus("completed")}
          disabled={isPending}
        >
          Done
        </Button>
        <Button
          variant="ghost"
          className="px-3 py-2 min-h-0 text-[12px]"
          onClick={() => updateStatus("canceled")}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-[11px] text-brick">{error}</p>}
    </div>
  );
}
