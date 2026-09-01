import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken } from "@/lib/invitations";
import { acceptInvitationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to be logged in to accept an invitation." }, { status: 401 });
  }

  const parsed = acceptInvitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(parsed.data.token);

  const { data: invitation } = await admin
    .from("caregiver_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "This invitation link isn't valid." }, { status: 404 });
  }
  if (invitation.status === "revoked") {
    return NextResponse.json({ error: "This invitation has been revoked." }, { status: 410 });
  }
  if (invitation.status === "accepted") {
    return NextResponse.json({ error: "This invitation has already been used." }, { status: 410 });
  }
  if (new Date(invitation.expires_at) < new Date()) {
    await admin.from("caregiver_invitations").update({ status: "expired" }).eq("id", invitation.id);
    return NextResponse.json({ error: "This invitation has expired. Ask the family admin to send a new one." }, { status: 410 });
  }
  if (invitation.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json(
      {
        error: `This invitation was sent to ${invitation.email}. Log out and use that email address to accept it.`,
      },
      { status: 403 }
    );
  }

  if (invitation.invited_role === "caregiver") {
    if (!invitation.care_recipient_id) {
      return NextResponse.json({ error: "This invitation is missing a care recipient." }, { status: 500 });
    }
    const { error: crcError } = await admin.from("care_recipient_caregivers").upsert(
      {
        care_recipient_id: invitation.care_recipient_id,
        profile_id: user.id,
        household_id: invitation.household_id,
        active: true,
      },
      { onConflict: "care_recipient_id,profile_id" }
    );
    if (crcError) {
      return NextResponse.json({ error: "Couldn't finish accepting the invitation." }, { status: 500 });
    }
  } else {
    const { error: memberError } = await admin.from("household_members").upsert(
      {
        household_id: invitation.household_id,
        profile_id: user.id,
        role: "family_member",
      },
      { onConflict: "household_id,profile_id" }
    );
    if (memberError) {
      return NextResponse.json({ error: "Couldn't finish accepting the invitation." }, { status: 500 });
    }
  }

  await admin
    .from("caregiver_invitations")
    .update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  await admin.from("audit_events").insert({
    household_id: invitation.household_id,
    actor_id: user.id,
    event_type: "caregiver_invitation_accepted",
    target_table: "caregiver_invitations",
    target_id: invitation.id,
  });

  const { data: acceptedProfile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const { data: admins } = await admin
    .from("household_members")
    .select("profile_id")
    .eq("household_id", invitation.household_id)
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    const name = acceptedProfile?.full_name || acceptedProfile?.email || invitation.email;
    await admin.from("notifications").insert(
      admins.map((a) => ({
        profile_id: a.profile_id,
        household_id: invitation.household_id,
        type: "invitation_accepted",
        title:
          invitation.invited_role === "caregiver"
            ? `${name} accepted your caregiver invitation`
            : `${name} joined as a family member`,
        related_table: "caregiver_invitations",
        related_id: invitation.id,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
