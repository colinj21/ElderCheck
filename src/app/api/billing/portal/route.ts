import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, isBillingConfigured } from "@/lib/billing";

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't set up yet. Check back soon." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { householdId } = await request.json().catch(() => ({}));
  if (!householdId) {
    return NextResponse.json({ error: "Missing householdId." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Only the family admin can manage billing." },
      { status: 403 }
    );
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("household_id", householdId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account found yet." }, { status: 404 });
  }

  const stripe = getStripeClient()!;
  const origin = new URL(request.url).origin;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("Stripe portal error:", message);
    return NextResponse.json(
      { error: `Couldn't open billing portal: ${message}` },
      { status: 500 }
    );
  }
}
