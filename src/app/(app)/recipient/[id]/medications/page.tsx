import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { MedicationLogButton } from "./medication-log-button";
import { LocalTime } from "@/components/local-time";
import { AddMedicationForm } from "./add-medication-form";
import type { Medication, MedicationLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MedicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: careRecipientId } = await params;
  const ctx = await requireUserContext();

  const isAdmin = ctx.households.some((h) => h.role === "admin");
  const isCaregiverHere = ctx.caregiverRecipientIds.includes(careRecipientId);
  const isHouseholdMember = ctx.households.length > 0;

  if (!isCaregiverHere && !isHouseholdMember) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: recipient } = await supabase
    .from("care_recipients")
    .select("id, full_name, preferred_name")
    .eq("id", careRecipientId)
    .maybeSingle();

  if (!recipient) {
    notFound();
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: medications }, { data: todaysLogs }] = await Promise.all([
    supabase
      .from("medications")
      .select("*")
      .eq("care_recipient_id", careRecipientId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("medication_logs")
      .select("*, profiles:taken_by(full_name)")
      .eq("care_recipient_id", careRecipientId)
      .eq("log_date", today)
      .order("taken_at", { ascending: false }),
  ]);

  const displayName = recipient.preferred_name || recipient.full_name;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{displayName}&apos;s medications</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Tap a medication once it&apos;s been given today.
        </p>
      </div>

      {(!medications || medications.length === 0) ? (
        <EmptyState
          title="No medications added yet"
          body={
            isAdmin
              ? "Add a medication below so caregivers can check it off when it's given."
              : "The family admin hasn't added any medications yet."
          }
        />
      ) : (
        <div className="space-y-2">
          {(medications as Medication[]).map((med) => {
            const logsToday = (todaysLogs as (MedicationLog & { profiles: { full_name: string } | null })[] ?? []).filter(
              (l) => l.medication_id === med.id
            );
            return (
              <Card key={med.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-ink">{med.name}</p>
                    <p className="mt-0.5 text-[13px] text-ink-soft">
                      {[med.dosage, med.frequency].filter(Boolean).join(" · ") || "No dosage set"}
                    </p>
                    {med.instructions && (
                      <p className="mt-1 text-[13px] text-ink-soft">{med.instructions}</p>
                    )}
                    {logsToday.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {logsToday.map((log) => (
                          <li key={log.id} className="text-[12px] text-moss-dark">
                            ✓ Given <LocalTime iso={log.taken_at} format="time" /> by{" "}
                            {log.profiles?.full_name ?? "someone"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <MedicationLogButton
                    medicationId={med.id}
                    latestLogId={logsToday[0]?.id ?? null}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isAdmin && <AddMedicationForm careRecipientId={careRecipientId} />}
    </div>
  );
}
