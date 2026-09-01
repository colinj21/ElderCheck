"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCareRecipientAction } from "@/lib/actions/onboarding";
import { Banner, Button, Field, Input, Textarea } from "@/components/ui";

export function NewRecipientForm({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCareRecipientAction(householdId, formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <Banner variant="error">{error}</Banner>}
      <Field label="Their name">
        <Input name="fullName" required placeholder="e.g. Maria Alvarez" />
      </Field>
      <Field label="Date of birth" hint="Optional">
        <Input name="dateOfBirth" type="date" />
      </Field>
      <Field label="Notes" hint="Optional — anything caregivers should know upfront.">
        <Textarea name="notes" rows={3} />
      </Field>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Create profile"}
      </Button>
    </form>
  );
}
