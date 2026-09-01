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
 * Creates in-app notification rows for the given profiles. This is an
 * in-app record only -- it does not send an email, push, or SMS. Nothing
 * in the app should claim a person "was notified" beyond this, since no
 * external delivery channel is configured yet.
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
