import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { Card, EmptyState, LinkButton, StatusBadge } from "@/components/ui";
import { TodayStatusBanner } from "./today-status";
import { AlertActions } from "./alert-actions";
import type { Alert, CareRecipient, Checkin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireUserContext();

  if (ctx.households.length === 0 && ctx.caregiverRecipientIds.length === 0) {
    redirect("/onboarding");
  }

  if (ctx.households.length === 0) {
    return <CaregiverDashboard caregiverRecipientIds={ctx.caregiverRecipientIds} />;
  }

  return <FamilyDashboard householdId={ctx.households[0].id} />;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function FamilyDashboard({ householdId }: { householdId: string }) {
  const supabase = await createClient();

  const { data: recipients } = await supabase
    .from("care_recipients")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (!recipients || recipients.length === 0) {
    return (
      <EmptyState
        title="Add your loved one's profile"
        body="Create a profile to start tracking check-ins, notes, and alerts."
        action={<LinkButton href="/onboarding">Finish setup</LinkButton>}
      />
    );
  }

  const recipientIds = recipients.map((r) => r.id);
  const today = todayString();

  const [
    { data: recentCheckins },
    { data: todaysCheckins },
    { data: openAlerts },
    { data: recentNotes },
  ] = await Promise.all([
    supabase
      .from("checkins")
      .select("*, profiles:caregiver_id(full_name)")
      .in("care_recipient_id", recipientIds)
      .order("submitted_at", { ascending: false })
      .limit(10),
    supabase
      .from("checkins")
      .select("*, profiles:caregiver_id(full_name)")
      .in("care_recipient_id", recipientIds)
      .eq("submission_day", today),
    supabase
      .from("alerts")
      .select("*, profiles:created_by(full_name)")
      .in("care_recipient_id", recipientIds)
      .neq("status", "resolved")
      .order("created_at", { ascending: false }),
    supabase
      .from("care_notes")
      .select("*, profiles:author_id(full_name)")
      .in("care_recipient_id", recipientIds)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const urgentCount = (openAlerts ?? []).filter((a) => a.severity === "urgent").length;
  const attentionCount = (openAlerts ?? []).filter((a) => a.severity === "attention").length;

  const checkedInTodayIds = new Set((todaysCheckins ?? []).map((c) => c.care_recipient_id));
  const namesMissingCheckin = recipients
    .filter((r) => !checkedInTodayIds.has(r.id))
    .map((r) => r.preferred_name || r.full_name);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Dashboard</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          A quick look at how things are going today.
        </p>
      </div>

      <TodayStatusBanner
        urgentCount={urgentCount}
        attentionCount={attentionCount}
        namesMissingCheckin={namesMissingCheckin}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {recipients.map((recipient: CareRecipient) => {
          const latest = (recentCheckins ?? []).find((c) => c.care_recipient_id === recipient.id);
          const checkedInToday = checkedInTodayIds.has(recipient.id);
          const unresolved = (openAlerts ?? []).filter((a) => a.care_recipient_id === recipient.id);
          return (
            <Card key={recipient.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg text-ink">
                    {recipient.preferred_name || recipient.full_name}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    {checkedInToday
                      ? `Checked in ${formatRelative(latest!.submitted_at)}`
                      : "No check-in yet today"}
                  </p>
                </div>
                <StatusBadge status={latest?.status ?? "normal"} />
              </div>
              {unresolved.length > 0 && (
                <p className="mt-3 text-[13px] font-medium text-brick">
                  {unresolved.length} unresolved {unresolved.length === 1 ? "concern" : "concerns"}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href={`/history?recipient=${recipient.id}`}
                  className="text-[13px] font-medium text-moss-dark underline underline-offset-2"
                >
                  View history
                </Link>
                <Link
                  href={`/recipient/${recipient.id}/medications`}
                  className="text-[13px] font-medium text-moss-dark underline underline-offset-2"
                >
                  Medications
                </Link>
                <Link
                  href={`/recipient/${recipient.id}/appointments`}
                  className="text-[13px] font-medium text-moss-dark underline underline-offset-2"
                >
                  Appointments
                </Link>
                <Link
                  href={`/recipient/${recipient.id}`}
                  className="text-[13px] font-medium text-moss-dark underline underline-offset-2"
                >
                  Edit profile
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <Link
        href="/recipient/new"
        className="inline-block text-[13px] font-medium text-moss-dark underline underline-offset-2"
      >
        + Add another loved one
      </Link>

      {(openAlerts?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink">Open concerns</h2>
          <div className="mt-3 space-y-2">
            {openAlerts!.map((alert: Alert & { profiles: { full_name: string } | null }) => {
              const recipient = recipients.find((r) => r.id === alert.care_recipient_id);
              return (
                <Card
                  key={alert.id}
                  className={
                    alert.severity === "urgent" ? "border-brick-light bg-brick-light/20" : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={alert.severity} />
                        {alert.status === "acknowledged" && (
                          <span className="text-[12px] font-medium text-ink-soft">Acknowledged</span>
                        )}
                      </div>
                      <p className="mt-2 text-[14px] text-ink">
                        {recipient && (
                          <span className="font-medium">
                            {recipient.preferred_name || recipient.full_name}:{" "}
                          </span>
                        )}
                        {alert.summary}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-soft">
                        Reported by {alert.profiles?.full_name ?? "a caregiver"} ·{" "}
                        {formatRelative(alert.created_at)}
                      </p>
                    </div>
                    <AlertActions alertId={alert.id} status={alert.status} />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <DailySummary recipients={recipients} todaysCheckins={todaysCheckins ?? []} />

      <section>
        <h2 className="font-display text-lg text-ink">Recent activity</h2>
        {(!recentCheckins || recentCheckins.length === 0) && (!recentNotes || recentNotes.length === 0) ? (
          <div className="mt-3">
            <EmptyState
              title="No activity yet"
              body="Once a caregiver submits a check-in, it will show up here."
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {buildActivityFeed(recentCheckins ?? [], recentNotes ?? [], recipients).map((item) => (
              <Card key={item.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] text-ink">{item.text}</p>
                  <p className="mt-1 text-[12px] text-ink-soft">{formatRelative(item.timestamp)}</p>
                </div>
                {item.status && <StatusBadge status={item.status} />}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DailySummary({
  recipients,
  todaysCheckins,
}: {
  recipients: CareRecipient[];
  todaysCheckins: (Checkin & { profiles: { full_name: string } | null })[];
}) {
  if (recipients.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-lg text-ink">Today at a glance</h2>
      <div className="mt-3 space-y-3">
        {recipients.map((recipient) => {
          const checkin = todaysCheckins.find((c) => c.care_recipient_id === recipient.id);
          const name = recipient.preferred_name || recipient.full_name;
          return (
            <Card key={recipient.id}>
              <p className="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                {name}
              </p>
              {checkin ? (
                <ul className="mt-2 space-y-1 text-[14px] text-ink">
                  <li>
                    ✓ Check-in completed by {checkin.profiles?.full_name ?? "a caregiver"}
                  </li>
                  <li>
                    {checkin.status === "normal"
                      ? "✓ No concerns reported"
                      : checkin.status === "attention"
                        ? "⚠ Caregiver flagged something to review"
                        : "⚠ Caregiver flagged an urgent concern"}
                  </li>
                  {checkin.notes && <li className="text-ink-soft">Note: {checkin.notes}</li>}
                </ul>
              ) : (
                <p className="mt-2 text-[14px] text-ink-soft">No check-in yet today.</p>
              )}
            </Card>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-soft">
        This summary reflects what caregivers have reported today. It isn&apos;t medical advice.
      </p>
    </section>
  );
}

type ActivityItem = {
  key: string;
  text: string;
  timestamp: string;
  status?: "normal" | "attention" | "urgent";
};

function buildActivityFeed(
  checkins: (Checkin & { profiles: { full_name: string } | null; care_recipient_id: string })[],
  notes: { id: string; created_at: string; body: string; care_recipient_id: string; profiles: { full_name: string } | null }[],
  recipients: CareRecipient[]
): ActivityItem[] {
  const nameFor = (id: string) => {
    const r = recipients.find((rec) => rec.id === id);
    return r ? r.preferred_name || r.full_name : "";
  };

  const items: ActivityItem[] = [
    ...checkins.map((c) => ({
      key: `checkin-${c.id}`,
      text: `${c.profiles?.full_name ?? "A caregiver"} completed a check-in for ${nameFor(c.care_recipient_id)}`,
      timestamp: c.submitted_at,
      status: c.status,
    })),
    ...notes.map((n) => ({
      key: `note-${n.id}`,
      text: `${n.profiles?.full_name ?? "Someone"} added a note for ${nameFor(n.care_recipient_id)}`,
      timestamp: n.created_at,
    })),
  ];

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
}

async function CaregiverDashboard({ caregiverRecipientIds }: { caregiverRecipientIds: string[] }) {
  const supabase = await createClient();

  if (caregiverRecipientIds.length === 0) {
    return (
      <EmptyState
        title="No assignments yet"
        body="Once a family adds you as a caregiver for their loved one, they'll show up here and you can start sending ElderCheck updates."
      />
    );
  }

  const { data: recipients } = await supabase
    .from("care_recipients")
    .select("*")
    .in("id", caregiverRecipientIds);

  const today = todayString();
  const { data: todaysCheckins } = await supabase
    .from("checkins")
    .select("care_recipient_id")
    .in("care_recipient_id", caregiverRecipientIds)
    .eq("submission_day", today);

  const completedToday = new Set((todaysCheckins ?? []).map((c) => c.care_recipient_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Your check-ins</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Thanks for taking care of them. Here's who needs a check-in today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(recipients ?? []).map((recipient: CareRecipient) => {
          const done = completedToday.has(recipient.id);
          return (
            <Card key={recipient.id}>
              <p className="font-display text-lg text-ink">
                {recipient.preferred_name || recipient.full_name}
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">
                {done ? "Today's check-in is complete." : "Today's check-in is still open."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {done ? (
                  <span className="text-[13px] font-medium text-moss-dark">Submitted ✓</span>
                ) : (
                  <LinkButton href={`/caregiver/checkin/${recipient.id}`}>Start check-in</LinkButton>
                )}
                <Link
                  href={`/recipient/${recipient.id}/medications`}
                  className="inline-flex items-center text-[13px] font-medium text-moss-dark underline underline-offset-2"
                >
                  Medications
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}
