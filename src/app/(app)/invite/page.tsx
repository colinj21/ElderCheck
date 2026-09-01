import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/session";
import { InviteForm } from "./invite-form";
import { Card, EmptyState } from "@/components/ui";
import { RevokeButton } from "./revoke-button";
import { RemoveCaregiverButton } from "./remove-caregiver-button";
import { ResendButton } from "./resend-button";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const ctx = await requireUserContext();
  const admin = ctx.households.find((h) => h.role === "admin");
  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: recipients }, { data: invitations }, { data: caregiverRows }] = await Promise.all([
    supabase.from("care_recipients").select("id, full_name, preferred_name").eq("household_id", admin.id),
    supabase
      .from("caregiver_invitations")
      .select("id, email, full_name, invited_role, status, expires_at, created_at, care_recipient_id")
      .eq("household_id", admin.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("care_recipient_caregivers")
      .select(
        "id, active, care_recipient_id, profiles:profile_id(id, full_name, email), care_recipients:care_recipient_id(full_name, preferred_name)"
      )
      .eq("household_id", admin.id),
  ]);

  const activeCaregiverRows = (caregiverRows ?? []).filter((c) => c.active) as unknown as {
    id: string;
    active: boolean;
    care_recipient_id: string;
    profiles: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
    care_recipients: { full_name: string; preferred_name: string | null } | { full_name: string; preferred_name: string | null }[] | null;
  }[];

  // Last check-in per caregiver, so the admin can see who's actually active.
  const caregiverIds = activeCaregiverRows
    .map((c) => (Array.isArray(c.profiles) ? c.profiles[0]?.id : c.profiles?.id))
    .filter((id): id is string => Boolean(id));

  let lastCheckinByCaregiver = new Map<string, string>();
  if (caregiverIds.length > 0) {
    const { data: lastCheckins } = await supabase
      .from("checkins")
      .select("caregiver_id, submitted_at")
      .in("caregiver_id", caregiverIds)
      .order("submitted_at", { ascending: false });
    for (const row of lastCheckins ?? []) {
      if (!lastCheckinByCaregiver.has(row.caregiver_id)) {
        lastCheckinByCaregiver.set(row.caregiver_id, row.submitted_at);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Invite people</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Invite a caregiver to do daily check-ins, or a family member to stay in the loop.
        </p>
      </div>

      <InviteForm householdId={admin.id} recipients={recipients ?? []} />

      <section>
        <h2 className="font-display text-lg text-ink">Pending &amp; past invitations</h2>
        <div className="mt-3 space-y-2">
          {(invitations ?? []).length === 0 && (
            <EmptyState
              title="No invitations sent yet"
              body="Invite a caregiver above so they can start sending you ElderCheck updates."
            />
          )}
          {(invitations ?? []).map((inv) => {
            const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();
            const displayStatus = isExpired ? "expired" : inv.status;
            return (
              <Card key={inv.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-ink">
                    {inv.email} <span className="text-ink-soft">· {inv.invited_role.replace("_", " ")}</span>
                  </p>
                  <p className="mt-1 text-[12px] text-ink-soft capitalize">{displayStatus}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(displayStatus === "pending" || displayStatus === "expired") && (
                    <ResendButton invitationId={inv.id} />
                  )}
                  {inv.status === "pending" && !isExpired && <RevokeButton invitationId={inv.id} />}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink">Active caregivers</h2>
        <div className="mt-3 space-y-2">
          {activeCaregiverRows.length === 0 && (
            <EmptyState
              title="No caregivers yet"
              body="Invite your first caregiver so they can begin sending you ElderCheck updates."
            />
          )}
          {activeCaregiverRows.map((c) => {
            const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            const recipient = Array.isArray(c.care_recipients) ? c.care_recipients[0] : c.care_recipients;
            const lastCheckin = profile?.id ? lastCheckinByCaregiver.get(profile.id) : undefined;
            return (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-ink">{profile?.full_name || profile?.email}</p>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    Caring for {recipient?.preferred_name || recipient?.full_name}
                    {lastCheckin
                      ? ` · last check-in ${new Date(lastCheckin).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : " · no check-ins yet"}
                  </p>
                </div>
                <RemoveCaregiverButton assignmentId={c.id} />
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
