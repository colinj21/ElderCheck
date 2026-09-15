"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, Field, Input, Textarea } from "@/components/ui";

export function AddMedicationForm({ careRecipientId }: { careRecipientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careRecipientId,
          name: formData.get("name"),
          dosage: formData.get("dosage"),
          frequency: formData.get("frequency"),
          instructions: formData.get("instructions"),
          prescribingDoctor: formData.get("prescribingDoctor"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save the medication.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Add a medication
      </Button>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-lg text-ink">Add a medication</h2>
      <form action={handleSubmit} className="mt-4 space-y-4">
        {error && <Banner variant="error">{error}</Banner>}
        <Field label="Name">
          <Input name="name" required placeholder="e.g. Lisinopril" />
        </Field>
        <Field label="Dosage" hint="Optional">
          <Input name="dosage" placeholder="e.g. 10mg" />
        </Field>
        <Field label="Frequency" hint="Optional">
          <Input name="frequency" placeholder="e.g. Once daily, morning" />
        </Field>
        <Field label="Instructions" hint="Optional">
          <Textarea name="instructions" rows={2} placeholder="e.g. Take with food" />
        </Field>
        <Field label="Prescribing doctor" hint="Optional">
          <Input name="prescribingDoctor" placeholder="e.g. Dr. Chen" />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Add medication"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
