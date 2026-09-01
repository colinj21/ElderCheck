"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCareRecipientProfileAction } from "@/lib/actions/onboarding";
import { Banner, Button, Field, Input, Textarea } from "@/components/ui";
import type { CareRecipient } from "@/lib/types";

export function RecipientProfileForm({ recipient }: { recipient: CareRecipient }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateCareRecipientProfileAction(recipient.id, formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && <Banner variant="error">{error}</Banner>}
      {saved && <Banner variant="success">Profile saved</Banner>}

      <div className="space-y-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Basics
        </p>
        <Field label="Preferred name" hint="What caregivers should call them, if different.">
          <Input name="preferredName" defaultValue={recipient.preferred_name ?? ""} />
        </Field>
      </div>

      <div className="space-y-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Emergency contact
        </p>
        <Field label="Name">
          <Input name="emergencyContactName" defaultValue={recipient.emergency_contact_name ?? ""} />
        </Field>
        <Field label="Phone">
          <Input
            name="emergencyContactPhone"
            type="tel"
            defaultValue={recipient.emergency_contact_phone ?? ""}
          />
        </Field>
      </div>

      <div className="space-y-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Care details
        </p>
        <Field label="Allergies" hint="Foods, medications, or anything else to watch for.">
          <Textarea name="allergies" defaultValue={recipient.allergies ?? ""} rows={2} />
        </Field>
        <Field label="Medication info" hint="Schedule, dosages, or reminders caregivers should know.">
          <Textarea name="medicationInfo" defaultValue={recipient.medication_info ?? ""} rows={3} />
        </Field>
        <Field label="Mobility needs">
          <Textarea name="mobilityNeeds" defaultValue={recipient.mobility_needs ?? ""} rows={2} />
        </Field>
        <Field label="Communication preferences" hint="Hearing, vision, language, or other notes.">
          <Textarea
            name="communicationPreferences"
            defaultValue={recipient.communication_preferences ?? ""}
            rows={2}
          />
        </Field>
        <Field label="Food preferences">
          <Textarea name="foodPreferences" defaultValue={recipient.food_preferences ?? ""} rows={2} />
        </Field>
        <Field label="Daily routine">
          <Textarea name="dailyRoutine" defaultValue={recipient.daily_routine ?? ""} rows={3} />
        </Field>
        <Field label="Instructions for caregivers">
          <Textarea
            name="caregiverInstructions"
            defaultValue={recipient.caregiver_instructions ?? ""}
            rows={3}
          />
        </Field>
        <Field label="Things they enjoy" hint="Hobbies, topics, activities that brighten their day.">
          <Textarea name="likesAndInterests" defaultValue={recipient.likes_and_interests ?? ""} rows={2} />
        </Field>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving\u2026" : "Save profile"}
      </Button>
    </form>
  );
}
