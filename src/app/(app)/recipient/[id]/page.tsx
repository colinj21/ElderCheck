import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { RecipientProfileForm } from "./recipient-profile-form";

export const dynamic = "force-dynamic";

export default async function RecipientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireUserContext();

  const admin = ctx.households.find((h) => h.role === "admin");
  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: recipient } = await supabase
    .from("care_recipients")
    .select("*")
    .eq("id", id)
    .eq("household_id", admin.id)
    .maybeSingle();

  if (!recipient) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">
          {recipient.preferred_name || recipient.full_name}&apos;s profile
        </h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Helpful details for anyone caring for them. Only fill in what's useful &mdash; nothing
          here is required.
        </p>
        <div className="mt-3 flex gap-4">
          <Link
            href={`/recipient/${id}/medications`}
            className="text-[13px] font-medium text-moss-dark underline underline-offset-2"
          >
            Medications
          </Link>
          <Link
            href={`/recipient/${id}/appointments`}
            className="text-[13px] font-medium text-moss-dark underline underline-offset-2"
          >
            Appointments
          </Link>
        </div>
      </div>
      <RecipientProfileForm recipient={recipient} />
    </div>
  );
}
