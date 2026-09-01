import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationPreferencesSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = notificationPreferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("notification_preferences").upsert({
    profile_id: user.id,
    email_on_checkin: parsed.data.emailOnCheckin,
    email_on_concern: parsed.data.emailOnConcern,
    email_on_missed_checkin: parsed.data.emailOnMissedCheckin,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "Couldn't save preferences." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
