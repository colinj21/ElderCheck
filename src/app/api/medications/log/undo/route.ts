import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({ logId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: log } = await admin
    .from("medication_logs")
    .select("id, household_id, care_recipient_id, taken_by, taken_at")
    .eq("id", parsed.data.logId)
    .maybeSingle();

  if (!log) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Only the person who logged it (or a family admin) can undo it, and only
  // within a short window, so this stays a quick "oops" fix, not a way to
  // rewrite history.
  const isOwnLog = log.taken_by === user.id;
  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", log.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!isOwnLog && !membership) {
    return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
  }

  const takenMinutesAgo = (Date.now() - new Date(log.taken_at).getTime()) / 60000;
  if (isOwnLog && !membership && takenMinutesAgo > 15) {
    return NextResponse.json(
      { error: "This was logged more than 15 minutes ago. Ask a family admin to remove it." },
      { status: 403 }
    );
  }

  const { error } = await admin.from("medication_logs").delete().eq("id", log.id);

  if (error) {
    return NextResponse.json({ error: "Couldn't undo this." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
