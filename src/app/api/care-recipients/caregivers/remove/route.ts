import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({ assignmentId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("care_recipient_caregivers")
    .select("id, household_id, profile_id, care_recipient_id")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", assignment.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
  }

  // Setting active=false immediately revokes this caregiver's access: every
  // RLS policy and admin-client authorization check for care recipient data
  // requires an active row here, so this takes effect on their very next
  // request -- no separate cleanup step needed.
  const { data, error } = await admin
    .from("care_recipient_caregivers")
    .update({ active: false })
    .eq("id", parsed.data.assignmentId)
    .select("id, household_id, profile_id, care_recipient_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Couldn't remove access." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found or you don't have permission." }, { status: 404 });
  }

  await admin.from("audit_events").insert({
    household_id: data.household_id,
    actor_id: user.id,
    event_type: "caregiver_removed",
    target_table: "care_recipient_caregivers",
    target_id: data.id,
    metadata: { profile_id: data.profile_id, care_recipient_id: data.care_recipient_id },
  });

  return NextResponse.json({ ok: true });
}
