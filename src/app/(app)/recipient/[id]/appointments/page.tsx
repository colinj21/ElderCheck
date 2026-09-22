import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { AddAppointmentForm } from "./add-appointment-form";
import { AppointmentActions } from "./appointment-actions";
import { LocalTime } from "@/components/local-time";
import type { Appointment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: careRecipientId } = await params;
  const ctx = await requireUserContext();

  const isAdmin = ctx.households.some((h) => h.role === "admin");
  const isCaregiverHere = ctx.caregiverRecipientIds.includes(careRecipientId);
  const isHouseholdMember = ctx.households.length > 0;

  if (!isCaregiverHere && !isHouseholdMember) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: recipient } = await supabase
    .from("care_recipients")
    .select("id, full_name, preferred_name")
    .eq("id", careRecipientId)
    .maybeSingle();

  if (!recipient) {
    notFound();
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("care_recipient_id", careRecipientId)
    .order("appointment_at", { ascending: true });

  const displayName = recipient.preferred_name || recipient.full_name;
  const now = Date.now();

  const upcoming = (appointments as Appointment[] ?? []).filter(
    (a) => a.status === "upcoming" && new Date(a.appointment_at).getTime() >= now
  );
  const past = (appointments as Appointment[] ?? []).filter(
    (a) => a.status !== "upcoming" || new Date(a.appointment_at).getTime() < now
  ).sort((a, b) => new Date(b.appointment_at).getTime() - new Date(a.appointment_at).getTime());

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">{displayName}&apos;s appointments</h1>
        <p className="mt-1 text-[14px] text-ink-soft">Doctor visits and other scheduled care.</p>
      </div>

      <section>
        <h2 className="font-display text-lg text-ink">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No upcoming appointments"
              body={
                isAdmin
                  ? "Add one below so caregivers and family know what's coming up."
                  : "The family admin hasn't scheduled anything yet."
              }
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {upcoming.map((appt) => (
              <Card key={appt.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-ink">{appt.title}</p>
                    <p className="mt-0.5 text-[13px] text-ink-soft">
                      <LocalTime iso={appt.appointment_at} format="datetimeWithWeekday" />
                    </p>
                    {(appt.doctor_name || appt.location) && (
                      <p className="mt-1 text-[13px] text-ink-soft">
                        {[appt.doctor_name, appt.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {appt.notes && <p className="mt-1 text-[13px] text-ink-soft">{appt.notes}</p>}
                  </div>
                  {isAdmin && <AppointmentActions appointmentId={appt.id} />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {isAdmin && <AddAppointmentForm careRecipientId={careRecipientId} />}

      {past.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink">Past</h2>
          <div className="mt-3 space-y-2">
            {past.map((appt) => (
              <Card key={appt.id} className="opacity-70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium text-ink">{appt.title}</p>
                    <p className="mt-0.5 text-[13px] text-ink-soft">
                      <LocalTime iso={appt.appointment_at} format="datetimeWithWeekday" /> ·{" "}
                      {appt.status === "canceled" ? "Canceled" : "Completed"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

