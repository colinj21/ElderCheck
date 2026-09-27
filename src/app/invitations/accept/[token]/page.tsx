"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Banner, Button, Field, Input } from "@/components/ui";

interface LookupResult {
  status: "pending" | "accepted" | "revoked" | "expired";
  email: string;
  fullName: string | null;
  role: "caregiver" | "family_member";
  householdName: string | null;
  careRecipientName: string | null;
}

export default function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [lookup, setLookup] = useState<LookupResult | null | "error">(null);
  const [mode, setMode] = useState<"choose" | "signup" | "login">("choose");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setLookup("error");
          return;
        }
        setLookup(await res.json());
      })
      .catch(() => setLookup("error"));
  }, [token]);

  async function acceptWithSession() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't accept this invitation.");
      return;
    }
    setAccepted(true);
    router.refresh();
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (lookup === "error" || !lookup) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: lookup.email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.user && !data.session) {
      setLoading(false);
      setError(
        "Check your email to verify your account, then come back to this link to finish accepting."
      );
      return;
    }

    await acceptWithSession();
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (lookup === "error" || !lookup) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: lookup.email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("That password isn&apos;t right for this account.");
      return;
    }

    await acceptWithSession();
  }

  if (lookup === null) {
    return <Centered>Loading invitation…</Centered>;
  }

  if (lookup === "error" || lookup.status !== "pending") {
    const messages: Record<string, string> = {
      accepted: "This invitation has already been used.",
      revoked: "This invitation has been revoked by the family admin.",
      expired: "This invitation has expired. Ask the family admin to send a new one.",
    };
    return (
      <Centered>
        <Banner variant="error">
          {lookup === "error" ? "This invitation link isn&apos;t valid." : messages[lookup.status]}
        </Banner>
      </Centered>
    );
  }

  if (accepted) {
    return (
      <div className="mx-auto max-w-sm px-6 py-14 text-center">
        <h1 className="font-display text-2xl text-ink">You&apos;re in!</h1>
        <p className="mt-3 text-[15px] text-ink-soft">
          You won&apos;t need to log in again on this phone — ElderCheck will keep you signed in
          here.
        </p>
        <div className="mt-6 rounded-2xl bg-moss-light p-5 text-left">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-moss-dark">
            Tip
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">
            Add ElderCheck to your home screen so it opens like an app. In your browser menu, tap{" "}
            <strong>&quot;Add to Home Screen&quot;</strong> (iPhone: the Share icon, then &quot;Add
            to Home Screen&quot;. Android: the ⋮ menu, then &quot;Add to Home screen&quot;).
          </p>
        </div>
        <Button className="mt-6 w-full" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-14">
      <h1 className="font-display text-2xl text-ink">
        Join {lookup.householdName ?? "the family"} on ElderCheck
      </h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        You've been invited as a {lookup.role === "caregiver" ? "caregiver" : "family member"}
        {lookup.careRecipientName ? ` for ${lookup.careRecipientName}` : ""}.
      </p>

      {mode === "choose" && (
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => setMode("signup")}>Create an account</Button>
          <Button variant="secondary" onClick={() => setMode("login")}>
            I already have an account
          </Button>
        </div>
      )}

      {mode === "signup" && (
        <form onSubmit={onSignup} className="mt-6 space-y-4">
          {error && <Banner variant="error">{error}</Banner>}
          <Field label="Email">
            <Input value={lookup.email} disabled />
          </Field>
          <Field label="Your name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account & accept"}
          </Button>
        </form>
      )}

      {mode === "login" && (
        <form onSubmit={onLogin} className="mt-6 space-y-4">
          {error && <Banner variant="error">{error}</Banner>}
          <Field label="Email">
            <Input value={lookup.email} disabled />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log in & accept"}
          </Button>
        </form>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center text-[15px] text-ink-soft">
      {children}
    </div>
  );
}
