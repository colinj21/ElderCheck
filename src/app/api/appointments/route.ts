import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appointmentSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = appointmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 }
    );
  }

  const appointmentDate = new Date(parsed.data.appointmentAt);
  if (Number.isNaN(appointmentDate.getTime())) {
    return NextResponse.json({ error: "Enter a valid date and time." }, { status: 400 });
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
      { error: "Only a family admin can add appointments." },
      { status: 403 }
    );
  }

  const { data, error } = await admin
    .from("appointments")
    .insert({
      household_id: recipient.household_id,
      care_recipient_id: parsed.data.careRecipientId,
      title: parsed.data.title,
      doctor_name: parsed.data.doctorName || null,
      location: parsed.data.location || null,
      appointment_at: appointmentDate.toISOString(),
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Couldn't save the appointment." }, { status: 500 });
  }

  await admin.from("audit_events").insert({
    household_id: recipient.household_id,
    actor_id: user.id,
    event_type: "appointment_added",
    target_table: "appointments",
    target_id: data.id,
  });

  return NextResponse.json({ ok: true, id: data.id });
}
