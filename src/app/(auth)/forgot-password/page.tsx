"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validation";
import { Banner, Button, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);

    // Always show the same success state, whether or not the email
    // exists, so we don&apos;t leak which addresses have accounts.
    if (resetError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink">Check your email</h1>
        <p className="mt-3 text-[15px] text-ink-soft">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset
          the password.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Reset your password</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        We&apos;ll email you a link to choose a new password.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Banner variant="error">{error}</Banner>}
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-ink-soft">
        <Link href="/login" className="font-medium text-moss-dark underline underline-offset-2">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
