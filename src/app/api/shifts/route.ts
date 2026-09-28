import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shiftAssignSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = shiftAssignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check your entry." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: recipient } = await admin
    .from("care_recipients")
    .select("household_id")
    .eq("id", parsed.data.careRecipientId)
    .maybeSingle();

  if (!recipient) {
    return NextResponse.json({ error: "Not found or you don't have access." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", recipient.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Only the family admin can edit the schedule." }, { status: 403 });
  }

  if (!parsed.data.caregiverId) {
    // Unassigning: just remove any existing row for this recipient/date.
    const { error } = await admin
      .from("caregiver_shifts")
      .delete()
      .eq("care_recipient_id", parsed.data.careRecipientId)
      .eq("shift_date", parsed.data.shiftDate);

    if (error) {
      return NextResponse.json({ error: "Couldn't update the schedule." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data: caregiverCheck } = await admin
    .from("care_recipient_caregivers")
    .select("id")
    .eq("care_recipient_id", parsed.data.careRecipientId)
    .eq("profile_id", parsed.data.caregiverId)
    .eq("active", true)
    .maybeSingle();

  if (!caregiverCheck) {
    return NextResponse.json(
      { error: "That person isn't an active caregiver for this recipient." },
      { status: 400 }
    );
  }

  const { error } = await admin.from("caregiver_shifts").upsert(
    {
      household_id: recipient.household_id,
      care_recipient_id: parsed.data.careRecipientId,
      shift_date: parsed.data.shiftDate,
      caregiver_id: parsed.data.caregiverId,
      notes: parsed.data.notes?.trim() || null,
      created_by: user.id,
    },
    { onConflict: "care_recipient_id,shift_date" }
  );

  if (error) {
    return NextResponse.json({ error: "Couldn't update the schedule." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
