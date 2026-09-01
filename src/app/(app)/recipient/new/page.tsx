import { redirect } from "next/navigation";
import { requireUserContext } from "@/lib/session";
import { remainingRecipientSlots } from "@/lib/billing";
import { NewRecipientForm } from "./new-recipient-form";
import { Banner, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewRecipientPage() {
  const ctx = await requireUserContext();
  const admin = ctx.households.find((h) => h.role === "admin");
  if (!admin) {
    redirect("/dashboard");
  }

  const remaining = await remainingRecipientSlots(admin.id);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Add a loved one</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Create another profile to track check-ins and care details separately.
        </p>
      </div>

      {remaining !== null && remaining <= 0 ? (
        <div className="space-y-4">
          <Banner variant="info">
            The free plan includes 1 loved one. Upgrade to add more and unlock unlimited
            history.
          </Banner>
          <LinkButton href="/settings">Go to billing</LinkButton>
        </div>
      ) : (
        <NewRecipientForm householdId={admin.id} />
      )}
    </div>
  );
}
