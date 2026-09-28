import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function PrintableHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ recipient?: string; days?: string }>;
}) {
  const ctx = await requireUserContext();
  if (ctx.households.length === 0) {
    redirect("/onboarding");
  }
  const householdId = ctx.households[0].id;
  const { recipient: recipientFilter, days: daysParam } = await searchParams;
  const days = Math.min(Math.max(Number(daysParam) || 30, 1), 365);

  const supabase = await createClient();

  const { data: recipients } = await supabase
    .from("care_recipients")
    .select("id, full_name, preferred_name")
    .eq("household_id", householdId);

  const recipientIds = recipientFilter ? [recipientFilter] : (recipients ?? []).map((r) => r.id);
  const safeIds = recipientIds.length ? recipientIds : ["00000000-0000-0000-0000-000000000000"];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: checkins }, { data: alerts }] = await Promise.all([
    supabase
      .from("checkins")
      .select("*, profiles:caregiver_id(full_name), care_recipients:care_recipient_id(full_name, preferred_name)")
      .in("care_recipient_id", safeIds)
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false })
      .limit(500),
    supabase
      .from("alerts")
      .select("*, profiles:created_by(full_name), care_recipients:care_recipient_id(full_name, preferred_name)")
      .in("care_recipient_id", safeIds)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const nameOf = (r: { full_name: string; preferred_name?: string | null } | null | undefined) =>
    r?.preferred_name || r?.full_name || "";

  const recipientLabel = recipientFilter
    ? nameOf(recipients?.find((r) => r.id === recipientFilter))
    : "All loved ones";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="no-print mb-6 flex items-center justify-between">
        <p className="text-[13px] text-ink-soft">
          This is a clean, printable version. Use your browser's print dialog (or "Save as PDF") to
          get a file you can share.
        </p>
        <PrintButton />
      </div>

      <div className="border-b border-line pb-4">
        <h1 className="font-display text-2xl text-ink">ElderCheck Report</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          {recipientLabel} · last {days} days · generated {new Date().toLocaleDateString()}
        </p>
      </div>

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">Check-ins ({checkins?.length ?? 0})</h2>
        {!checkins || checkins.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-soft">No check-ins in this period.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-1.5 pr-3 font-medium">Date</th>
                <th className="py-1.5 pr-3 font-medium">Who</th>
                <th className="py-1.5 pr-3 font-medium">Caregiver</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {checkins.map((c) => {
                const recipient = Array.isArray(c.care_recipients) ? c.care_recipients[0] : c.care_recipients;
                const caregiver = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                return (
                  <tr key={c.id} className="border-b border-line align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {new Date(c.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 pr-3">{nameOf(recipient)}</td>
                    <td className="py-1.5 pr-3">{caregiver?.full_name ?? ""}</td>
                    <td className="py-1.5 pr-3 capitalize">{c.status}</td>
                    <td className="py-1.5">{c.notes ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">Concerns flagged ({alerts?.length ?? 0})</h2>
        {!alerts || alerts.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-soft">No concerns flagged in this period.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-1.5 pr-3 font-medium">Date</th>
                <th className="py-1.5 pr-3 font-medium">Who</th>
                <th className="py-1.5 pr-3 font-medium">Severity</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const recipient = Array.isArray(a.care_recipients) ? a.care_recipients[0] : a.care_recipients;
                return (
                  <tr key={a.id} className="border-b border-line align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 pr-3">{nameOf(recipient)}</td>
                    <td className="py-1.5 pr-3 capitalize">{a.severity}</td>
                    <td className="py-1.5 pr-3 capitalize">{a.status}</td>
                    <td className="py-1.5">{a.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <p className="mt-10 text-[11px] text-ink-soft">
        Generated by ElderCheck. ElderCheck is not an emergency response or medical monitoring
        service.
      </p>
    </div>
  );
}
