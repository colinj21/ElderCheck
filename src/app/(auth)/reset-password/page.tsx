"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validation";
import { Banner, Button, Field, Input } from "@/components/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);

    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes("session")
          ? "This reset link has expired. Request a new one."
          : updateError.message
      );
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  if (done) {
    return (
      <div>
        <h1 className="font-display text-2xl text-ink">Password updated</h1>
        <p className="mt-3 text-[15px] text-ink-soft">Taking you to your dashboard…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Choose a new password</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Banner variant="error">{error}</Banner>}
        <Field label="New password" hint="At least 8 characters.">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
