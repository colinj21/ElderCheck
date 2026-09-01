import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken } from "@/lib/invitations";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length < 20) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(token);

  const { data: invitation } = await admin
    .from("caregiver_invitations")
    .select(
      "id, email, full_name, invited_role, status, expires_at, household_id, households(name), care_recipients(full_name)"
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const status = invitation.status === "pending" && isExpired ? "expired" : invitation.status;

  const household = Array.isArray(invitation.households) ? invitation.households[0] : invitation.households;
  const careRecipient = Array.isArray(invitation.care_recipients)
    ? invitation.care_recipients[0]
    : invitation.care_recipients;

  return NextResponse.json({
    status,
    email: invitation.email,
    fullName: invitation.full_name,
    role: invitation.invited_role,
    householdName: household?.name ?? null,
    careRecipientName: careRecipient?.full_name ?? null,
  });
}
