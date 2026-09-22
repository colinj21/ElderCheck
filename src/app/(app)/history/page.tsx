import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { LocalTime } from "@/components/local-time";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ recipient?: string; status?: string }>;
}) {
  const ctx = await requireUserContext();
  if (ctx.households.length === 0) {
    redirect("/onboarding");
  }
  const householdId = ctx.households[0].id;
  const { recipient: recipientFilter, status: statusFilter } = await searchParams;

  const supabase = await createClient();

  const { data: recipients } = await supabase
    .from("care_recipients")
    .select("id, full_name, preferred_name")
    .eq("household_id", householdId);

  const recipientIds = recipientFilter ? [recipientFilter] : (recipients ?? []).map((r) => r.id);
  const safeIds = recipientIds.length ? recipientIds : ["00000000-0000-0000-0000-000000000000"];
  const validStatus =
    statusFilter && ["normal", "attention", "urgent"].includes(statusFilter) ? statusFilter : null;

  let checkinQuery = supabase
    .from("checkins")
    .select("*, profiles:caregiver_id(full_name), care_recipients:care_recipient_id(full_name, preferred_name)")
    .in("care_recipient_id", safeIds)
    .order("submitted_at", { ascending: false })
    .limit(50);
  if (validStatus) checkinQuery = checkinQuery.eq("status", validStatus);

  let alertQuery = supabase
    .from("alerts")
    .select("*, profiles:created_by(full_name), care_recipients:care_recipient_id(full_name, preferred_name)")
    .in("care_recipient_id", safeIds)
    .order("created_at", { ascending: false })
    .limit(50);
  if (validStatus) alertQuery = alertQuery.eq("severity", validStatus);

  const [{ data: checkins }, { data: alerts }, { data: notes }] = await Promise.all([
    checkinQuery,
    // Concerns only make sense to show when filtering by attention/urgent,
    // or when showing everything -- "normal" has no matching concerns.
    validStatus === "normal" ? Promise.resolve({ data: [] as never[] }) : alertQuery,
    validStatus
      ? Promise.resolve({ data: [] as never[] })
      : supabase
          .from("care_notes")
          .select("*, profiles:author_id(full_name), care_recipients:care_recipient_id(full_name, preferred_name)")
          .in("care_recipient_id", safeIds)
          .order("created_at", { ascending: false })
          .limit(50),
  ]);

  type Item = {
    id: string;
    kind: "checkin" | "note" | "concern";
    timestamp: string;
    recipientName: string;
    authorName: string;
    status?: "normal" | "attention" | "urgent";
    body?: string | null;
    resolutionNote?: string;
  };

  const nameOf = (r: { full_name: string; preferred_name?: string | null } | null | undefined) =>
    r?.preferred_name || r?.full_name || "";

  const items: Item[] = [
    ...(checkins ?? []).map((c) => ({
      id: c.id,
      kind: "checkin" as const,
      timestamp: c.submitted_at,
      recipientName: nameOf(Array.isArray(c.care_recipients) ? c.care_recipients[0] : c.care_recipients),
      authorName: (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles)?.full_name ?? "A caregiver",
      status: c.status,
      body: c.notes,
    })),
    ...(notes ?? []).map((n) => ({
      id: n.id,
      kind: "note" as const,
      timestamp: n.created_at,
      recipientName: nameOf(Array.isArray(n.care_recipients) ? n.care_recipients[0] : n.care_recipients),
      authorName: (Array.isArray(n.profiles) ? n.profiles[0] : n.profiles)?.full_name ?? "Someone",
      body: n.body,
    })),
    ...(alerts ?? []).map((a) => ({
      id: a.id,
      kind: "concern" as const,
      timestamp: a.created_at,
      recipientName: nameOf(Array.isArray(a.care_recipients) ? a.care_recipients[0] : a.care_recipients),
      authorName: (Array.isArray(a.profiles) ? a.profiles[0] : a.profiles)?.full_name ?? "A caregiver",
      status: a.severity,
      body: a.summary,
      resolutionNote:
        a.status === "resolved" ? "Resolved" : a.status === "acknowledged" ? "Acknowledged" : "Open",
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">History</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Every check-in, note, and concern from your caregivers, in one place.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 text-[13px]">
          <FilterLink label="All" active={!recipientFilter} href={statusQueryHref(undefined, validStatus)} />
          {(recipients ?? []).map((r) => (
            <FilterLink
              key={r.id}
              label={r.preferred_name || r.full_name}
              active={recipientFilter === r.id}
              href={statusQueryHref(r.id, validStatus)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[13px]">
          <FilterLink label="Any status" active={!validStatus} href={recipientQueryHref(recipientFilter, undefined)} />
          <FilterLink label="Normal" active={validStatus === "normal"} href={recipientQueryHref(recipientFilter, "normal")} />
          <FilterLink label="Needs attention" active={validStatus === "attention"} href={recipientQueryHref(recipientFilter, "attention")} />
          <FilterLink label="Urgent" active={validStatus === "urgent"} href={recipientQueryHref(recipientFilter, "urgent")} />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No history yet"
          body="Once caregivers submit check-ins, notes, or concerns, they'll appear here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={`${item.kind}-${item.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] text-ink">
                    <span className="font-medium">{item.authorName}</span>{" "}
                    {item.kind === "checkin"
                      ? "submitted a check-in"
                      : item.kind === "concern"
                        ? "reported a concern"
                        : "added a note"}{" "}
                    for <span className="font-medium">{item.recipientName}</span>
                  </p>
                  {item.body && <p className="mt-1.5 text-[14px] text-ink-soft">{item.body}</p>}
                  <p className="mt-2 text-[12px] text-ink-soft">
                    {item.resolutionNote && <span className="mr-2">{item.resolutionNote} ·</span>}
                    <LocalTime iso={item.timestamp} format="datetime" />
                  </p>
                </div>
                {item.status && <StatusBadge status={item.status} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function statusQueryHref(recipientId: string | undefined, status: string | null) {
  const params = new URLSearchParams();
  if (recipientId) params.set("recipient", recipientId);
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `/history?${qs}` : "/history";
}

function recipientQueryHref(recipientId: string | undefined, status: string | undefined) {
  const params = new URLSearchParams();
  if (recipientId) params.set("recipient", recipientId);
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `/history?${qs}` : "/history";
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <a
      href={href}
      className={`rounded-full border px-3 py-1.5 font-medium transition-colors ${
        active ? "border-moss bg-moss-light text-moss-dark" : "border-line text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </a>
  );
}
