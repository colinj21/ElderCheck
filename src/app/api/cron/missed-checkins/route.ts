import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, getHouseholdMemberIds, getEmailsForProfileIds } from "@/lib/notify";
import { sendEmail, missedCheckinEmail } from "@/lib/email";

// Runs once daily near the end of the day (see vercel.json) and flags any
// care recipient who has at least one active caregiver but received no
// check-in today. This is deliberately a single, global cutoff time in
// UTC rather than a per-family local time, since the app doesn't store a
// timezone per household -- the dashboard's live "Today's status" banner
// already gives each viewer a same-day, locally-timed warning; this cron
// is what actually pushes an in-app notification + email once per day,
// which the banner alone can't do since nobody has to be looking at it.
//
// Idempotent: if this fires more than once on the same UTC day for the
// same recipient, it skips re-notifying by checking for an existing
// "missed_checkin" notification created today.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const startOfToday = `${today}T00:00:00.000Z`;

  const { data: recipients, error: recipientsError } = await admin
    .from("care_recipients")
    .select("id, household_id, full_name, preferred_name");

  if (recipientsError) {
    return NextResponse.json({ ok: false, error: recipientsError.message }, { status: 500 });
  }

  const { data: activeCaregiverLinks } = await admin
    .from("care_recipient_caregivers")
    .select("care_recipient_id")
    .eq("active", true);

  const recipientIdsWithCaregivers = new Set(
    (activeCaregiverLinks ?? []).map((l) => l.care_recipient_id as string)
  );
  const trackedRecipients = (recipients ?? []).filter((r) => recipientIdsWithCaregivers.has(r.id));

  if (trackedRecipients.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, flagged: 0 });
  }

  const recipientIds = trackedRecipients.map((r) => r.id);

  const { data: todaysCheckins } = await admin
    .from("checkins")
    .select("care_recipient_id")
    .in("care_recipient_id", recipientIds)
    .eq("submission_day", today);

  const checkedInIds = new Set((todaysCheckins ?? []).map((c) => c.care_recipient_id as string));
  const missing = trackedRecipients.filter((r) => !checkedInIds.has(r.id));

  let flaggedCount = 0;

  for (const recipient of missing) {
    const { data: existingNotice } = await admin
      .from("notifications")
      .select("id")
      .eq("related_table", "care_recipients")
      .eq("related_id", recipient.id)
      .eq("type", "missed_checkin")
      .gte("created_at", startOfToday)
      .limit(1)
      .maybeSingle();

    if (existingNotice) continue;

    const recipientName = recipient.preferred_name || recipient.full_name;
    const memberIds = await getHouseholdMemberIds(recipient.household_id);

    await notify({
      profileIds: memberIds,
      householdId: recipient.household_id,
      type: "missed_checkin",
      title: `${recipientName} hasn't had a check-in today`,
      relatedTable: "care_recipients",
      relatedId: recipient.id,
    });

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("profile_id, email_on_missed_checkin")
      .in("profile_id", memberIds);
    const optedOut = new Set(
      (prefs ?? []).filter((p) => p.email_on_missed_checkin === false).map((p) => p.profile_id as string)
    );
    const emailableIds = memberIds.filter((id) => !optedOut.has(id));
    const emails = await getEmailsForProfileIds(emailableIds);
    if (emails.length > 0) {
      const dashboardUrl = new URL("/dashboard", request.url).toString();
      const { subject, html, text } = missedCheckinEmail({ recipientName, dashboardUrl });
      await Promise.all(emails.map((to) => sendEmail({ to, subject, html, text })));
    }

    flaggedCount += 1;
  }

  return NextResponse.json({
    ok: true,
    checked: trackedRecipients.length,
    flagged: flaggedCount,
    ranAt: new Date().toISOString(),
  });
}
