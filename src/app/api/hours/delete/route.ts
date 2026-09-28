import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoursDeleteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = hoursDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: entry } = await admin
    .from("caregiver_hours")
    .select("id, household_id, caregiver_id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const isOwnEntry = entry.caregiver_id === user.id;
  let isAdmin = false;
  if (!isOwnEntry) {
    const { data: membership } = await admin
      .from("household_members")
      .select("role")
      .eq("household_id", entry.household_id)
      .eq("profile_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    isAdmin = Boolean(membership);
  }

  if (!isOwnEntry && !isAdmin) {
    return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
  }

  const { error } = await admin.from("caregiver_hours").delete().eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: "Couldn't delete that entry." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
