"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function AlertActions({
  alertId,
  status,
}: {
  alertId: string;
  status: "open" | "acknowledged" | "resolved";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(path: "acknowledge" | "resolve") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/alerts/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  if (status === "resolved") {
    return <span className="text-[13px] font-medium text-moss-dark">Resolved</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "open" && (
          <Button
            variant="secondary"
            className="px-3 py-2 min-h-0 text-[13px]"
            onClick={() => act("acknowledge")}
            disabled={isPending}
          >
            {isPending ? "Saving\u2026" : "Acknowledge"}
          </Button>
        )}
        <Button
          variant="secondary"
          className="px-3 py-2 min-h-0 text-[13px]"
          onClick={() => act("resolve")}
          disabled={isPending}
        >
          {isPending ? "Saving\u2026" : "Mark resolved"}
        </Button>
      </div>
      {error && <p className="text-[12px] text-brick">{error}</p>}
    </div>
  );
}
