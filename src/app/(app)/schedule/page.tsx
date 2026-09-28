import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { EmptyState } from "@/components/ui";
import { ScheduleGrid } from "./schedule-grid";
import type { CareRecipient } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAYS_AHEAD = 14;

function dateStrings(count: number) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default async function SchedulePage() {
  const ctx = await requireUserContext();

  if (ctx.households.length === 0 && ctx.caregiverRecipientIds.length === 0) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const isAdmin = ctx.households.some((h) => h.role === "admin");
  const dates = dateStrings(DAYS_AHEAD);

  if (ctx.households.length === 0) {
    // Pure caregiver: show just their own upcoming assignments.
    const { data: shifts } = await supabase
      .from("caregiver_shifts")
      .select("*, care_recipients:care_recipient_id(full_name, preferred_name)")
      .eq("caregiver_id", ctx.userId)
      .gte("shift_date", dates[0])
      .lte("shift_date", dates[dates.length - 1])
      .order("shift_date", { ascending: true });

    if (!shifts || shifts.length === 0) {
      return (
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-2xl text-ink">Your schedule</h1>
          <div className="mt-4">
            <EmptyState
              title="No shifts assigned yet"
              body="Once the family admin schedules you for a day, it'll show up here."
            />
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl text-ink">Your schedule</h1>
        <p className="mt-1 text-[14px] text-ink-soft">The next {DAYS_AHEAD} days you're covering.</p>
        <div className="mt-4 space-y-2">
          {shifts.map((s) => {
            const recipient = Array.isArray(s.care_recipients) ? s.care_recipients[0] : s.care_recipients;
            const name = recipient?.preferred_name || recipient?.full_name || "someone";
            return (
              <div key={s.id} className="rounded-2xl border border-line bg-white p-4">
                <p className="text-[14px] text-ink">
                  <span className="font-medium">{s.shift_date}</span> — covering {name}
                </p>
                {s.notes && <p className="mt-1 text-[13px] text-ink-soft">{s.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const householdId = ctx.households[0].id;
  const { data: recipients } = await supabase
    .from("care_recipients")
    .select("*")
    .eq("household_id", householdId);

  const recipientList: CareRecipient[] = recipients ?? [];

  if (recipientList.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl text-ink">Schedule</h1>
        <div className="mt-4">
          <EmptyState title="Add your loved one's profile first" body="You'll be able to schedule caregiver coverage once a profile exists." />
        </div>
      </div>
    );
  }

  const recipientIds = recipientList.map((r) => r.id);

  const [{ data: caregiverLinks }, { data: shifts }] = await Promise.all([
    supabase
      .from("care_recipient_caregivers")
      .select("care_recipient_id, profile_id, profiles:profile_id(full_name)")
      .in("care_recipient_id", recipientIds)
      .eq("active", true),
    supabase
      .from("caregiver_shifts")
      .select("*")
      .in("care_recipient_id", recipientIds)
      .gte("shift_date", dates[0])
      .lte("shift_date", dates[dates.length - 1]),
  ]);

  const caregiversByRecipient: Record<string, { id: string; name: string }[]> = {};
  for (const link of caregiverLinks ?? []) {
    const profile = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
    const list = caregiversByRecipient[link.care_recipient_id] ?? [];
    list.push({ id: link.profile_id, name: profile?.full_name ?? "Caregiver" });
    caregiversByRecipient[link.care_recipient_id] = list;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl text-ink">Schedule</h1>
      <p className="mt-1 text-[14px] text-ink-soft">
        Who's covering who, for the next {DAYS_AHEAD} days.
        {!isAdmin && " Only the family admin can make changes here."}
      </p>
      <div className="mt-6">
        <ScheduleGrid
          dates={dates}
          recipients={recipientList}
          caregiversByRecipient={caregiversByRecipient}
          shifts={shifts ?? []}
          canEdit={isAdmin}
        />
      </div>
    </div>
  );
}
