import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvitationToken, hashInvitationToken } from "@/lib/invitations";
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
    .select("id, household_id, status")
    .eq("id", parsed.data.invitationId)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }
  if (invitation.status !== "pending" && invitation.status !== "expired") {
    return NextResponse.json(
      { error: "Only pending or expired invitations can be resent." },
      { status: 400 }
    );
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

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("caregiver_invitations")
    .update({ token_hash: tokenHash, status: "pending", expires_at: newExpiry })
    .eq("id", invitation.id);

  if (error) {
    return NextResponse.json({ error: "Couldn't resend the invitation." }, { status: 500 });
  }

  const inviteUrl = new URL(`/invitations/accept/${token}`, request.url).toString();

  return NextResponse.json({ inviteUrl, expiresAt: newExpiry });
}
