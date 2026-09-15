import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { medicationLogSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = medicationLogSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: medication } = await admin
    .from("medications")
    .select("id, household_id, care_recipient_id, name")
    .eq("id", parsed.data.medicationId)
    .eq("active", true)
    .maybeSingle();

  if (!medication) {
    return NextResponse.json({ error: "Medication not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", medication.household_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: caregiverCheck } = await admin
    .from("care_recipient_caregivers")
    .select("id")
    .eq("care_recipient_id", medication.care_recipient_id)
    .eq("profile_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!membership && !caregiverCheck) {
    return NextResponse.json({ error: "You don't have access to this." }, { status: 403 });
  }

  const { data, error } = await admin
    .from("medication_logs")
    .insert({
      medication_id: medication.id,
      household_id: medication.household_id,
      care_recipient_id: medication.care_recipient_id,
      taken_by: user.id,
      notes: parsed.data.notes || null,
    })
    .select("id, taken_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Couldn't log this dose." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, takenAt: data.taken_at });
}
