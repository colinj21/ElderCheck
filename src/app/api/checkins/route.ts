import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkinSubmitSchema } from "@/lib/validation";
import { notify, getHouseholdMemberIds } from "@/lib/notify";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = checkinSubmitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check your answers." },
      { status: 400 }
    );
  }

  const { careRecipientId, templateId, status, notes, responses } = parsed.data;
  const admin = createAdminClient();

  const { data: recipient } = await admin
    .from("care_recipients")
    .select("household_id, full_name, preferred_name")
    .eq("id", careRecipientId)
    .maybeSingle();

  if (!recipient) {
    return NextResponse.json({ error: "Not found or you don't have access." }, { status: 404 });
  }

  const { data: caregiverCheck } = await admin
    .from("care_recipient_caregivers")
    .select("id")
    .eq("care_recipient_id", careRecipientId)
    .eq("profile_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!caregiverCheck) {
    return NextResponse.json({ error: "You're not an active caregiver for this person." }, { status: 403 });
  }

  const { data: caregiverProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: checkin, error: checkinError } = await admin
    .from("checkins")
    .insert({
      household_id: recipient.household_id,
      care_recipient_id: careRecipientId,
      template_id: templateId,
      caregiver_id: user.id,
      status,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (checkinError) {
    // Unique constraint on (care_recipient_id, caregiver_id, submission_day)
    // blocks accidental duplicate submissions for the same day.
    if (checkinError.code === "23505") {
      return NextResponse.json(
        { error: "You've already submitted a check-in for today." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Couldn't save the check-in. Please try again." }, { status: 500 });
  }

  const { error: responsesError } = await admin.from("checkin_responses").insert(
    responses.map((r) => ({
      checkin_id: checkin.id,
      question_id: r.questionId,
      category: r.category,
      value_text: r.valueText ?? null,
      value_number: r.valueNumber ?? null,
      value_boolean: r.valueBoolean ?? null,
    }))
  );

  if (responsesError) {
    return NextResponse.json(
      { error: "The check-in saved, but some answers didn't. Please contact the family admin." },
      { status: 500 }
    );
  }

  const recipientName = recipient.preferred_name || recipient.full_name;
  const caregiverName = caregiverProfile?.full_name || "A caregiver";
  const memberIds = await getHouseholdMemberIds(recipient.household_id);

  if (status !== "normal") {
    await admin.from("alerts").insert({
      household_id: recipient.household_id,
      care_recipient_id: careRecipientId,
      checkin_id: checkin.id,
      severity: status,
      summary: notes?.trim()
        ? notes.trim().slice(0, 300)
        : status === "urgent"
          ? "Caregiver flagged today's check-in as urgent."
          : "Caregiver flagged today's check-in as needing attention.",
      created_by: user.id,
    });

    await notify({
      profileIds: memberIds,
      householdId: recipient.household_id,
      type: status === "urgent" ? "urgent_concern" : "attention_concern",
      title:
        status === "urgent"
          ? `Urgent: ${caregiverName} flagged a concern for ${recipientName}`
          : `${caregiverName} flagged something to review for ${recipientName}`,
      body: notes?.trim() || undefined,
      relatedTable: "checkins",
      relatedId: checkin.id,
    });
  } else {
    await notify({
      profileIds: memberIds,
      householdId: recipient.household_id,
      type: "checkin_completed",
      title: `${caregiverName} completed today's check-in for ${recipientName}`,
      relatedTable: "checkins",
      relatedId: checkin.id,
    });
  }

  await admin.from("audit_events").insert({
    household_id: recipient.household_id,
    actor_id: user.id,
    event_type: "checkin_submitted",
    target_table: "checkins",
    target_id: checkin.id,
    metadata: { status },
  });

  return NextResponse.json({ ok: true, checkinId: checkin.id });
}
