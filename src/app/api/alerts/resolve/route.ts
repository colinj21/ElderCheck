import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({ alertId: z.string().uuid() });

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

  const { data: alert } = await admin
    .from("alerts")
    .select("id, household_id, status")
    .eq("id", parsed.data.alertId)
    .maybeSingle();

  if (!alert) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", alert.household_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
  }

  if (alert.status === "resolved") {
    return NextResponse.json({ error: "This concern is already resolved." }, { status: 409 });
  }

  const { error } = await admin
    .from("alerts")
    .update({
      status: "resolved",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alert.id);

  if (error) {
    return NextResponse.json({ error: "Couldn't resolve this concern." }, { status: 500 });
  }

  await admin.from("audit_events").insert({
    household_id: alert.household_id,
    actor_id: user.id,
    event_type: "concern_resolved",
    target_table: "alerts",
    target_id: alert.id,
  });

  return NextResponse.json({ ok: true });
}
