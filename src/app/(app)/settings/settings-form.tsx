"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Banner, Button, Card, Field, Input } from "@/components/ui";
import type { NotificationPreferences, Profile } from "@/lib/types";
import { PLANS } from "@/lib/plans";
import type { HouseholdSubscription } from "@/lib/billing";

export function SettingsForm({
  profile,
  preferences,
  isAdmin,
  householdId,
  subscription,
}: {
  profile: Profile;
  preferences: NotificationPreferences;
  isAdmin: boolean;
  householdId: string | null;
  subscription: HouseholdSubscription | null;
}) {
  return (
    <div className="space-y-6">
      <ProfileSection profile={profile} />
      {isAdmin && householdId && (
        <BillingSection householdId={householdId} subscription={subscription} />
      )}
      <NotificationsSection preferences={preferences} />
      <PasswordSection />
      <DangerSection isAdmin={isAdmin} />
    </div>
  );
}

function BillingSection({
  householdId,
  subscription,
}: {
  householdId: string;
  subscription: HouseholdSubscription | null;
}) {
  const searchParams = useSearchParams();
  const billingResult = searchParams.get("billing");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = subscription?.plan ?? "free";
  const isPaid = currentPlan !== "free";

  async function choosePlan(plan: "plus" | "family") {
    setLoadingPlan(plan);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId, plan }),
    });
    const data = await res.json().catch(() => ({}));
    setLoadingPlan(null);
    if (!res.ok) {
      setError(data.error ?? "Couldn't start checkout.");
      return;
    }
    window.location.href = data.url;
  }

  async function manageBilling() {
    setLoadingPlan("manage");
    setError(null);
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoadingPlan(null);
    if (!res.ok) {
      setError(data.error ?? "Couldn't open billing portal.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <Card>
      <h2 className="font-display text-lg text-ink">Plan &amp; billing</h2>

      {billingResult === "success" && (
        <div className="mt-3">
          <Banner variant="success">Your plan is updated. Thanks for supporting ElderCheck!</Banner>
        </div>
      )}
      {billingResult === "canceled" && (
        <div className="mt-3">
          <Banner variant="info">Checkout was canceled — no changes were made.</Banner>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-4 ${
                isCurrent ? "border-moss bg-moss-light" : "border-line"
              }`}
            >
              <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-soft">
                {plan.name}
              </p>
              <p className="mt-1 text-[22px] font-display text-ink">
                {plan.price}
                <span className="text-[13px] font-sans text-ink-soft"> {plan.priceDetail}</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-[13px] text-ink-soft">
                    · {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                {isCurrent ? (
                  <span className="text-[13px] font-medium text-moss-dark">Current plan</span>
                ) : plan.id === "free" ? (
                  <span className="text-[13px] text-ink-soft">
                    {isPaid ? "Downgrade via Manage billing" : ""}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full px-3 py-2 min-h-0 text-[13px]"
                    onClick={() => choosePlan(plan.id as "plus" | "family")}
                    disabled={loadingPlan !== null}
                  >
                    {loadingPlan === plan.id ? "Loading…" : `Choose ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isPaid && (
        <div className="mt-4">
          <Button variant="secondary" onClick={manageBilling} disabled={loadingPlan !== null}>
            {loadingPlan === "manage" ? "Loading…" : "Manage billing"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function ProfileSection({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/settings/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save.");
      setStatus("error");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <Card>
      <h2 className="font-display text-lg text-ink">Profile</h2>
      <form onSubmit={save} className="mt-4 space-y-4">
        {error && <Banner variant="error">{error}</Banner>}
        <Field label="Name">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <Input value={profile.email} disabled />
        </Field>
        <Field label="Phone" hint="Optional">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}

function NotificationsSection({ preferences }: { preferences: NotificationPreferences }) {
  const [prefs, setPrefs] = useState(preferences);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    const res = await fetch("/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOnCheckin: prefs.email_on_checkin,
        emailOnConcern: prefs.email_on_concern,
        emailOnMissedCheckin: prefs.email_on_missed_checkin,
      }),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <Card>
      <h2 className="font-display text-lg text-ink">Notifications</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Email delivery requires an email provider to be connected (see project README).
        These preferences are saved now so they take effect the moment it is.
      </p>
      <div className="mt-4 space-y-3">
        <Toggle
          label="Email me when a check-in is submitted"
          checked={prefs.email_on_checkin}
          onChange={(v) => setPrefs((p) => ({ ...p, email_on_checkin: v }))}
        />
        <Toggle
          label="Email me when a concern is flagged"
          checked={prefs.email_on_concern}
          onChange={(v) => setPrefs((p) => ({ ...p, email_on_concern: v }))}
        />
        <Toggle
          label="Email me if a check-in is missed"
          checked={prefs.email_on_missed_checkin}
          onChange={(v) => setPrefs((p) => ({ ...p, email_on_missed_checkin: v }))}
        />
      </div>
      <Button className="mt-4" onClick={save} disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save preferences"}
      </Button>
    </Card>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-[14px] text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-moss" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function PasswordSection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendReset() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
    }
    setLoading(false);
    setSent(true);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-display text-lg text-ink">Password &amp; session</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={sendReset} disabled={loading}>
          {sent ? "Reset link sent" : loading ? "Sending…" : "Send password reset email"}
        </Button>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </div>
    </Card>
  );
}

function DangerSection({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't delete your account.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="border-brick-light">
      <h2 className="font-display text-lg text-brick">Delete account</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        {isAdmin
          ? "This permanently deletes your account and everything in your household — profiles, check-ins, notes, and caregiver access. This can't be undone."
          : "This permanently deletes your account. Any check-ins or notes you left for a household will remain, without being attributed to you."}
      </p>
      {error && (
        <div className="mt-3">
          <Banner variant="error">{error}</Banner>
        </div>
      )}
      <div className="mt-4">
        {!confirming ? (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete my account
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="danger" onClick={deleteAccount} disabled={loading}>
              {loading ? "Deleting…" : "Yes, permanently delete"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
