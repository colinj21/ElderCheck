import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type NotifyInput = {
  profileIds: string[];
  householdId: string;
  type: string;
  title: string;
  body?: string;
  relatedTable?: string;
  relatedId?: string;
};

/**
 * Creates in-app notification rows for the given profiles (the bell icon
 * / notifications page). Doesn't send email -- callers that also want to
 * email should filter recipients through filterProfileIdsByPreference()
 * for the matching email_on_* column and call sendEmail() separately.
 */
export async function notify({
  profileIds,
  householdId,
  type,
  title,
  body,
  relatedTable,
  relatedId,
}: NotifyInput) {
  if (profileIds.length === 0) return;
  const admin = createAdminClient();
  const uniqueIds = Array.from(new Set(profileIds));
  await admin.from("notifications").insert(
    uniqueIds.map((profile_id) => ({
      profile_id,
      household_id: householdId,
      type,
      title,
      body: body ?? null,
      related_table: relatedTable ?? null,
      related_id: relatedId ?? null,
    }))
  );
}

/** All admin + family_member profile ids for a household. */
export async function getHouseholdMemberIds(householdId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("household_members")
    .select("profile_id")
    .eq("household_id", householdId);
  return (data ?? []).map((r) => r.profile_id as string);
}

/**
 * Looks up sign-in email addresses for a set of profile ids. Emails
 * aren't stored on the profiles table -- they live in Supabase Auth --
 * so this calls the admin auth API per id. Best-effort: a lookup
 * failure for one profile is skipped rather than failing the batch.
 */
export async function getEmailsForProfileIds(profileIds: string[]): Promise<string[]> {
  if (profileIds.length === 0) return [];
  const admin = createAdminClient();
  const results = await Promise.all(
    Array.from(new Set(profileIds)).map(async (id) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data?.user?.email) return null;
        return data.user.email;
      } catch {
        return null;
      }
    })
  );
  return results.filter((email): email is string => Boolean(email));
}

type PreferenceColumn =
  | "email_on_checkin"
  | "email_on_concern"
  | "email_on_missed_checkin"
  | "in_app_on_checkin"
  | "in_app_on_concern"
  | "in_app_on_missed_checkin"
  | "push_on_concern"
  | "push_on_missed_checkin";

/**
 * Narrows a list of profile ids down to the ones who haven't opted out of
 * a given notification preference column. A profile with no preferences
 * row yet is treated as opted in (matches the column defaults) -- only an
 * explicit `false` removes someone from the list.
 */
export async function filterProfileIdsByPreference(
  profileIds: string[],
  column: PreferenceColumn
): Promise<string[]> {
  if (profileIds.length === 0) return [];
  const admin = createAdminClient();
  const uniqueIds = Array.from(new Set(profileIds));
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select(`profile_id, ${column}`)
    .in("profile_id", uniqueIds);
  const optedOut = new Set(
    (prefs ?? [])
      .filter((p) => (p as Record<string, unknown>)[column] === false)
      .map((p) => p.profile_id as string)
  );
  return uniqueIds.filter((id) => !optedOut.has(id));
}
