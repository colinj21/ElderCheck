"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, Field, Input, Textarea } from "@/components/ui";

export function AddAppointmentForm({ careRecipientId }: { careRecipientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    // Store the real instant: `${date}T${time}` alone is a wall-clock string
    // Postgres would interpret as UTC, shifting every appointment by the
    // family's UTC offset. new Date(...) uses the browser's timezone.
    const appointmentAt = date && time ? new Date(`${date}T${time}`).toISOString() : "";

    startTransition(async () => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careRecipientId,
          title: formData.get("title"),
          doctorName: formData.get("doctorName"),
          location: formData.get("location"),
          appointmentAt,
          notes: formData.get("notes"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save the appointment.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Add an appointment
      </Button>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-lg text-ink">Add an appointment</h2>
      <form action={handleSubmit} className="mt-4 space-y-4">
        {error && <Banner variant="error">{error}</Banner>}
        <Field label="What's this appointment for?">
          <Input name="title" required placeholder="e.g. Cardiology follow-up" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input name="date" type="date" required />
          </Field>
          <Field label="Time">
            <Input name="time" type="time" required />
          </Field>
        </div>
        <Field label="Doctor" hint="Optional">
          <Input name="doctorName" placeholder="e.g. Dr. Chen" />
        </Field>
        <Field label="Location" hint="Optional">
          <Input name="location" placeholder="e.g. Main St Medical Center" />
        </Field>
        <Field label="Notes" hint="Optional">
          <Textarea name="notes" rows={2} placeholder="e.g. Bring insurance card" />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Add appointment"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
