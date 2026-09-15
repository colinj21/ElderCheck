import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { medicationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = medicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
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
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", recipient.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Only a family admin can add medications." },
      { status: 403 }
    );
  }

  const { data, error } = await admin
    .from("medications")
    .insert({
      household_id: recipient.household_id,
      care_recipient_id: parsed.data.careRecipientId,
      name: parsed.data.name,
      dosage: parsed.data.dosage || null,
      frequency: parsed.data.frequency || null,
      instructions: parsed.data.instructions || null,
      prescribing_doctor: parsed.data.prescribingDoctor || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Couldn't save the medication." }, { status: 500 });
  }

  await admin.from("audit_events").insert({
    household_id: recipient.household_id,
    actor_id: user.id,
    event_type: "medication_added",
    target_table: "medications",
    target_id: data.id,
  });

  return NextResponse.json({ ok: true, id: data.id });
}
