import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({ medicationId: z.string().uuid() });

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

  const { data: medication } = await admin
    .from("medications")
    .select("id, household_id")
    .eq("id", parsed.data.medicationId)
    .maybeSingle();

  if (!medication) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", medication.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
  }

  const { error } = await admin
    .from("medications")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", medication.id);

  if (error) {
    return NextResponse.json({ error: "Couldn't update the medication." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
