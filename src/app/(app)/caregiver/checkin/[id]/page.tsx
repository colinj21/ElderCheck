import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { CheckinForm } from "./checkin-form";
import { Banner } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CaregiverCheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: careRecipientId } = await params;
  await requireUserContext();

  const supabase = await createClient();

  // RLS enforces that this only returns data if the current user is
  // an active caregiver for this recipient (or a household member).
  const { data: recipient } = await supabase
    .from("care_recipients")
    .select("id, full_name, preferred_name, household_id")
    .eq("id", careRecipientId)
    .maybeSingle();

  if (!recipient) {
    notFound();
  }

  const displayName = recipient.preferred_name || recipient.full_name;

  const { data: template } = await supabase
    .from("checkin_templates")
    .select("id, checkin_questions(*)")
    .eq("care_recipient_id", careRecipientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("care_recipient_id", careRecipientId)
    .eq("caregiver_id", user!.id)
    .eq("submission_day", today)
    .maybeSingle();

  if (!template) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <Banner variant="error">
          No check-in template has been set up for {displayName} yet. Ask the
          family admin to check the household settings.
        </Banner>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10 text-center">
        <h1 className="font-display text-xl text-ink">Already submitted</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          You've already completed today's check-in for {displayName}. Thank you!
        </p>
      </div>
    );
  }

  const questions = (template.checkin_questions as unknown as { sort_order: number }[]).sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <h1 className="font-display text-2xl text-ink">Check in for {displayName}</h1>
      <p className="mt-1 text-[14px] text-ink-soft">Takes about two minutes.</p>
      <div className="mt-6">
        <CheckinForm
          careRecipientId={recipient.id}
          templateId={template.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          questions={questions as any}
        />
      </div>
    </div>
  );
}
