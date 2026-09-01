import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { getHouseholdSubscription } from "@/lib/billing";
import { SettingsForm } from "./settings-form";
import type { NotificationPreferences } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireUserContext();
  const supabase = await createClient();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", ctx.userId)
    .maybeSingle();

  const isAdmin = ctx.households.some((h) => h.role === "admin");
  const adminHousehold = ctx.households.find((h) => h.role === "admin");
  const subscription = adminHousehold
    ? await getHouseholdSubscription(adminHousehold.id)
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Account settings</h1>
      </div>
      <Suspense>
        <SettingsForm
          profile={ctx.profile}
          preferences={
            (prefs as NotificationPreferences | null) ?? {
              profile_id: ctx.userId,
              email_on_checkin: true,
              email_on_concern: true,
              email_on_missed_checkin: true,
            }
          }
          isAdmin={isAdmin}
          householdId={adminHousehold?.id ?? null}
          subscription={subscription}
        />
      </Suspense>
    </div>
  );
}
