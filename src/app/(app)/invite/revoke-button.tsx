"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function RevokeButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function revoke() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/invitations/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't revoke.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <Button variant="ghost" onClick={revoke} disabled={isPending} className="px-3 py-2 min-h-0">
        {isPending ? "Revoking…" : "Revoke"}
      </Button>
      {error && <p className="text-[12px] text-brick">{error}</p>}
    </div>
  );
}
