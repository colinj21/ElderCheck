"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import type { CareRecipient, CaregiverShift } from "@/lib/types";

function recipientLabel(r: { full_name: string; preferred_name: string | null }) {
  return r.preferred_name || r.full_name;
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date().toISOString().slice(0, 10);
  const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return dateStr === today ? `Today · ${label}` : label;
}

export function ScheduleGrid({
  dates,
  recipients,
  caregiversByRecipient,
  shifts,
  canEdit,
}: {
  dates: string[];
  recipients: CareRecipient[];
  caregiversByRecipient: Record<string, { id: string; name: string }[]>;
  shifts: CaregiverShift[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  const shiftFor = (recipientId: string, date: string) =>
    shifts.find((s) => s.care_recipient_id === recipientId && s.shift_date === date);

  async function assign(recipientId: string, date: string, caregiverId: string) {
    const key = `${recipientId}-${date}`;
    setSaving(key);
    await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        careRecipientId: recipientId,
        shiftDate: date,
        caregiverId: caregiverId || null,
      }),
    });
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {dates.map((date) => (
        <Card key={date}>
          <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            {formatDate(date)}
          </p>
          <div className="mt-2 space-y-2">
            {recipients.map((recipient) => {
              const shift = shiftFor(recipient.id, date);
              const options = caregiversByRecipient[recipient.id] ?? [];
              const key = `${recipient.id}-${date}`;
              return (
                <div key={recipient.id} className="flex items-center justify-between gap-3">
                  <span className="text-[14px] text-ink">{recipientLabel(recipient)}</span>
                  {canEdit ? (
                    <select
                      value={shift?.caregiver_id ?? ""}
                      disabled={saving === key}
                      onChange={(e) => assign(recipient.id, date, e.target.value)}
                      className="rounded-lg border border-line bg-white px-2 py-1.5 text-[13px] text-ink"
                    >
                      <option value="">Unassigned</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[13px] text-ink-soft">
                      {options.find((c) => c.id === shift?.caregiver_id)?.name ?? "Unassigned"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
