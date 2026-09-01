"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHouseholdAction, createCareRecipientAction } from "@/lib/actions/onboarding";
import { Banner, Button, Field, Input, Textarea } from "@/components/ui";

type Step = "household" | "recipient" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("household");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleHouseholdSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createHouseholdAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setHouseholdId(result.householdId!);
      setStep("recipient");
    });
  }

  function handleRecipientSubmit(formData: FormData) {
    if (!householdId) return;
    setError(null);
    startTransition(async () => {
      const result = await createCareRecipientAction(householdId, formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setStep("done");
    });
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Steps current={step} />

      {step === "household" && (
        <div className="mt-8">
          <h1 className="font-display text-2xl text-ink">Name your household</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            This is just for your own organization — e.g. "The Alvarez Family."
          </p>
          <form action={handleHouseholdSubmit} className="mt-6 space-y-4">
            {error && <Banner variant="error">{error}</Banner>}
            <Field label="Household name">
              <Input name="name" required placeholder="The Alvarez Family" />
            </Field>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving…" : "Continue"}
            </Button>
          </form>
        </div>
      )}

      {step === "recipient" && (
        <div className="mt-8">
          <h1 className="font-display text-2xl text-ink">Who are you caring for?</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Add your loved one's profile. You can edit this anytime.
          </p>
          <form action={handleRecipientSubmit} className="mt-6 space-y-4">
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
        </div>
      )}

      {step === "done" && (
        <div className="mt-8 text-center">
          <h1 className="font-display text-2xl text-ink">You're all set</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Next, invite a caregiver so daily check-ins can start coming in.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => router.push("/invite")}>Invite a caregiver</Button>
            <Button variant="secondary" onClick={() => router.push("/dashboard")}>
              I'll do this later
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "household", label: "Household" },
    { key: "recipient", label: "Loved one" },
    { key: "done", label: "Done" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-2">
          <div
            className={`h-1.5 flex-1 rounded-full ${
              i <= currentIndex ? "bg-moss" : "bg-line"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
