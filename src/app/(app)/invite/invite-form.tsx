"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, Field, Input } from "@/components/ui";

export function InviteForm({
  householdId,
  recipients,
}: {
  householdId: string;
  recipients: { id: string; full_name: string }[];
}) {
  const [role, setRole] = useState<"caregiver" | "family_member">("caregiver");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [careRecipientId, setCareRecipientId] = useState(recipients[0]?.id ?? "");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);

    if (role === "caregiver" && !careRecipientId) {
      setError("Add a loved one's profile before inviting a caregiver.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        householdId,
        careRecipientId: role === "caregiver" ? careRecipientId : undefined,
        email,
        fullName,
        role,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't send the invitation.");
      return;
    }

    setInviteUrl(data.inviteUrl);
    setEmail("");
    setFullName("");
    // Re-fetch server data so the new invitation shows up in
    // "Pending & past invitations" without a manual page reload.
    router.refresh();
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Banner variant="error">{error}</Banner>}

        <div className="flex gap-2">
          <RoleButton active={role === "caregiver"} onClick={() => setRole("caregiver")}>
            Caregiver
          </RoleButton>
          <RoleButton active={role === "family_member"} onClick={() => setRole("family_member")}>
            Family member
          </RoleButton>
        </div>

        {role === "caregiver" && (
          <Field label="Caring for">
            <select
              value={careRecipientId}
              onChange={(e) => setCareRecipientId(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] text-ink"
            >
              {recipients.length === 0 && <option value="">No loved-one profile yet</option>}
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Their name" hint="Optional">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>

        <Button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send invitation"}
        </Button>

        {inviteUrl && (
          <div className="rounded-xl bg-moss-light p-4">
            <p className="text-[13px] font-medium text-moss-dark">
              No email provider is connected yet, so share this link directly:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-[12px] text-ink">
                {inviteUrl}
              </code>
              <Button type="button" variant="secondary" onClick={copyLink} className="px-3 py-2 min-h-0">
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}

function RoleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-colors ${
        active ? "border-moss bg-moss-light text-moss-dark" : "border-line text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
