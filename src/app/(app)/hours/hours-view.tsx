"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, EmptyState, Field, Input, Textarea } from "@/components/ui";
import type { CareRecipient } from "@/lib/types";
import type { HoursEntry } from "./page";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function recipientLabel(r: { full_name: string; preferred_name: string | null }) {
  return r.preferred_name || r.full_name;
}

export function HoursView({
  loggableRecipients,
  entries,
  currentUserId,
  isAdmin,
}: {
  loggableRecipients: CareRecipient[];
  entries: HoursEntry[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [careRecipientId, setCareRecipientId] = useState(loggableRecipients[0]?.id ?? "");
  const [workDate, setWorkDate] = useState(todayString());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const thisMonthPrefix = todayString().slice(0, 7);
  const thisMonthTotal = useMemo(
    () =>
      entries
        .filter((e) => e.caregiver_id === currentUserId && e.work_date.startsWith(thisMonthPrefix))
        .reduce((sum, e) => sum + Number(e.hours), 0),
    [entries, currentUserId, thisMonthPrefix]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!careRecipientId) {
      setError("Choose who you cared for.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careRecipientId, workDate, hours, notes }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't save those hours.");
      return;
    }

    setHours("");
    setNotes("");
    setWorkDate(todayString());
    router.refresh();
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/hours/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {loggableRecipients.length > 0 && (
        <Card>
          <h2 className="font-display text-lg text-ink">Log hours</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            You've logged <strong>{thisMonthTotal.toFixed(2)}</strong> hour
            {thisMonthTotal === 1 ? "" : "s"} this month.
          </p>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            {error && <Banner variant="error">{error}</Banner>}
            {loggableRecipients.length > 1 && (
              <Field label="Who did you care for">
                <select
                  value={careRecipientId}
                  onChange={(e) => setCareRecipientId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] text-ink"
                >
                  {loggableRecipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {recipientLabel(r)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date">
                <Input
                  type="date"
                  value={workDate}
                  max={todayString()}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Hours" hint="e.g. 3.5">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min="0.25"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Notes" hint="Optional">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Log hours"}
            </Button>
          </form>
        </Card>
      )}

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg text-ink">
            {loggableRecipients.length > 0 ? "All logged hours" : "Logged hours"}
          </h2>
          {entries.length > 0 && (
            <a
              href="/api/hours/export"
              className="text-[13px] font-medium text-moss-dark underline underline-offset-2"
            >
              Export CSV
            </a>
          )}
        </div>
        {entries.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No hours logged yet" body="Once a caregiver logs hours, they'll show up here." />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {entries.map((entry) => {
              const canDelete = entry.caregiver_id === currentUserId || isAdmin;
              return (
                <Card key={entry.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] text-ink">
                      <span className="font-medium">{Number(entry.hours).toFixed(2)}h</span>
                      {" — "}
                      {entry.care_recipients ? recipientLabel(entry.care_recipients) : "Unknown"}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-soft">
                      {entry.work_date} · logged by {entry.profiles?.full_name ?? "a caregiver"}
                    </p>
                    {entry.notes && <p className="mt-2 text-[13px] text-ink-soft">{entry.notes}</p>}
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="flex-shrink-0 text-[13px] font-medium text-brick underline underline-offset-2 disabled:opacity-50"
                    >
                      {deletingId === entry.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
