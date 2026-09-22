"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validation";
import { Banner, Button, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentVerification, setSentVerification] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = signupSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is required, Supabase returns a user with
    // no active session yet.
    if (data.user && !data.session) {
      setSentVerification(true);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  if (sentVerification) {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink">Check your email</h1>
        <p className="mt-3 text-[15px] text-ink-soft">
          We sent a verification link to <strong>{email}</strong>. Follow it to finish
          creating your account.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Create your family account</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        You'll set up your loved one's profile next.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Banner variant="error">{error}</Banner>}
        <Field label="Your name">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          By creating an account, you agree to our{" "}
          <Link href="/legal" className="underline underline-offset-2">
            privacy &amp; terms
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-[14px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-moss-dark underline underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}
