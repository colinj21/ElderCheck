import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({ invitationId: z.string().uuid() });

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

  const { data: invitation } = await admin
    .from("caregiver_invitations")
    .select("id, household_id")
    .eq("id", parsed.data.invitationId)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", invitation.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
  }

  const { data, error } = await admin
    .from("caregiver_invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.invitationId)
    .eq("status", "pending")
    .select("id, household_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Couldn't revoke the invitation." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Invitation not found, already used, or you don't have permission." },
      { status: 404 }
    );
  }

  await admin.from("audit_events").insert({
    household_id: data.household_id,
    actor_id: user.id,
    event_type: "caregiver_invitation_revoked",
    target_table: "caregiver_invitations",
    target_id: data.id,
  });

  return NextResponse.json({ ok: true });
}
