import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { careNoteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = careNoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check your note." },
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
    return NextResponse.json({ error: "Not found or you don't have access." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", recipient.household_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: caregiverCheck } = await admin
    .from("care_recipient_caregivers")
    .select("id")
    .eq("care_recipient_id", parsed.data.careRecipientId)
    .eq("profile_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!membership && !caregiverCheck) {
    return NextResponse.json({ error: "Not found or you don't have access." }, { status: 404 });
  }

  const { error } = await admin.from("care_notes").insert({
    household_id: recipient.household_id,
    care_recipient_id: parsed.data.careRecipientId,
    author_id: user.id,
    body: parsed.data.body,
  });

  if (error) {
    return NextResponse.json({ error: "Couldn't save the note." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
