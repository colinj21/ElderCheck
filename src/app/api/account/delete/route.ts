import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Households this user administers get fully deleted -- deleting a
  // family admin's account deletes that family's data (check-ins,
  // notes, invitations, caregiver assignments, everything scoped to
  // that household). Authorization is enforced manually here (must be
  // an admin of the household) since this uses the admin client rather
  // than relying on RLS for the delete itself.
  const { data: adminHouseholds } = await admin
    .from("household_members")
    .select("household_id")
    .eq("profile_id", user.id)
    .eq("role", "admin");

  for (const { household_id } of adminHouseholds ?? []) {
    const { error } = await admin.from("households").delete().eq("id", household_id);
    if (error) {
      return NextResponse.json(
        { error: "Couldn't delete one of your households. Please try again or contact support." },
        { status: 500 }
      );
    }
  }

  // Deleting the auth user cascades to the profiles row, which in
  // turn cascades to notification_preferences and any remaining
  // household_members / care_recipient_caregivers rows (e.g. where
  // this person was a family member or caregiver elsewhere). Historical
  // check-ins, notes, and invitations authored by this person in
  // households they don't own are preserved with their authorship
  // field set to null, rather than being deleted or blocking this
  // request (see migration 0001 for the ON DELETE SET NULL choices).
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return NextResponse.json(
      { error: "Your household data was removed, but account deletion failed. Please contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
