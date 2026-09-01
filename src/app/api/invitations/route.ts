import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteSchema } from "@/lib/validation";
import { generateInvitationToken, hashInvitationToken } from "@/lib/invitations";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const householdId = new URL(request.url).searchParams.get("householdId");
  if (!householdId) {
    return NextResponse.json({ error: "Missing householdId." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("caregiver_invitations")
    .select("id, email, full_name, invited_role, status, expires_at, created_at, care_recipient_id")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Couldn't load invitations." }, { status: 500 });
  }

  return NextResponse.json({ invitations: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid invitation." },
      { status: 400 }
    );
  }

  const { householdId, careRecipientId, email, fullName, role } = parsed.data;
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Only a family admin can send invitations." },
      { status: 403 }
    );
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);

  const { data: invitation, error } = await admin
    .from("caregiver_invitations")
    .insert({
      household_id: householdId,
      care_recipient_id: careRecipientId ?? null,
      invited_by: user.id,
      invited_role: role,
      email,
      full_name: fullName || null,
      token_hash: tokenHash,
    })
    .select("id, expires_at")
    .single();

  if (error || !invitation) {
    return NextResponse.json({ error: "Couldn't create the invitation." }, { status: 500 });
  }

  await admin.from("audit_events").insert({
    household_id: householdId,
    actor_id: user.id,
    event_type: "caregiver_invited",
    target_table: "caregiver_invitations",
    target_id: invitation.id,
    metadata: { email, role },
  });

  const inviteUrl = new URL(`/invitations/accept/${token}`, request.url).toString();

  return NextResponse.json({
    inviteUrl,
    expiresAt: invitation.expires_at,
  });
}
