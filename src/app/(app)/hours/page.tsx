import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { HoursView } from "./hours-view";
import type { CareRecipient, CaregiverHours } from "@/lib/types";

export const dynamic = "force-dynamic";

export type HoursEntry = CaregiverHours & {
  care_recipients: { full_name: string; preferred_name: string | null } | null;
  profiles: { full_name: string } | null;
};

export default async function HoursPage() {
  const ctx = await requireUserContext();

  if (ctx.households.length === 0 && ctx.caregiverRecipientIds.length === 0) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const isAdmin = ctx.households.some((h) => h.role === "admin");

  // Recipients this person can log hours against (as an active caregiver).
  let loggableRecipients: CareRecipient[] = [];
  if (ctx.caregiverRecipientIds.length > 0) {
    const { data } = await supabase
      .from("care_recipients")
      .select("*")
      .in("id", ctx.caregiverRecipientIds);
    loggableRecipients = data ?? [];
  }

  // Recipients this person's household(s) can see totals for.
  let householdRecipientIds: string[] = [];
  if (ctx.households.length > 0) {
    const { data } = await supabase
      .from("care_recipients")
      .select("id")
      .in(
        "household_id",
        ctx.households.map((h) => h.id)
      );
    householdRecipientIds = (data ?? []).map((r) => r.id as string);
  }

  const visibleRecipientIds = Array.from(
    new Set([...ctx.caregiverRecipientIds, ...householdRecipientIds])
  );

  let entries: HoursEntry[] = [];
  if (visibleRecipientIds.length > 0) {
    const { data } = await supabase
      .from("caregiver_hours")
      .select("*, care_recipients:care_recipient_id(full_name, preferred_name), profiles:caregiver_id(full_name)")
      .in("care_recipient_id", visibleRecipientIds)
      .order("work_date", { ascending: false })
      .limit(200);
    entries = (data as HoursEntry[] | null) ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Hours</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          {ctx.caregiverRecipientIds.length > 0
            ? "Log the hours you worked, and see everyone's logged hours."
            : "Hours logged by caregivers."}
        </p>
      </div>

      <HoursView
        loggableRecipients={loggableRecipients}
        entries={entries}
        currentUserId={ctx.userId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
