import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoursLogSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = hoursLogSchema.safeParse(await request.json().catch(() => null));
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

  const { data: caregiverCheck } = await admin
    .from("care_recipient_caregivers")
    .select("id")
    .eq("care_recipient_id", parsed.data.careRecipientId)
    .eq("profile_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!caregiverCheck) {
    return NextResponse.json({ error: "You're not an active caregiver for this person." }, { status: 403 });
  }

  const { error } = await admin.from("caregiver_hours").insert({
    household_id: recipient.household_id,
    care_recipient_id: parsed.data.careRecipientId,
    caregiver_id: user.id,
    work_date: parsed.data.workDate,
    hours: parsed.data.hours,
    notes: parsed.data.notes?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: "Couldn't save those hours. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
