"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function ResendButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  function resend() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/invitations/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't resend.");
        return;
      }
      await navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      setCopiedUrl(data.inviteUrl);
      router.refresh();
      setTimeout(() => setCopiedUrl(null), 3000);
    });
  }

  return (
    <div className="text-right">
      <Button variant="ghost" onClick={resend} disabled={isPending} className="px-3 py-2 min-h-0">
        {isPending ? "Resending\u2026" : copiedUrl ? "Link copied" : "Resend"}
      </Button>
      {error && <p className="text-[12px] text-brick">{error}</p>}
    </div>
  );
}
