import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Couldn't load notifications." }, { status: 500 });
  }

  return NextResponse.json({ notifications: data });
}

const markReadSchema = z.object({
  notificationId: z.string().uuid().optional(),
  markAllRead: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = markReadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (parsed.data.markAllRead) {
    await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("profile_id", user.id)
      .is("read_at", null);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.notificationId) {
    await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("id", parsed.data.notificationId)
      .eq("profile_id", user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}
