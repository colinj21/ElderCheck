import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(["upcoming", "completed", "canceled"]),
});

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

  const { data: appointment } = await admin
    .from("appointments")
    .select("id, household_id")
    .eq("id", parsed.data.appointmentId)
    .maybeSingle();

  if (!appointment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", appointment.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
  }

  const { error } = await admin
    .from("appointments")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", appointment.id);

  if (error) {
    return NextResponse.json({ error: "Couldn't update the appointment." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
