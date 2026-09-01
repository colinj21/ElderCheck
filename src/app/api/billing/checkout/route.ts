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

  const stripe = getStripeClient()!;

  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("household_id", householdId)
    .maybeSingle();

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email,
      name: profile?.full_name ?? undefined,
      metadata: { household_id: householdId },
    });
    customerId = customer.id;
  }

  const origin = new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=canceled`,
    client_reference_id: householdId,
    subscription_data: {
      metadata: { household_id: householdId },
    },
  });

  // Record the pending customer id now so the webhook can find this
  // household even if it fires before the row otherwise exists.
  await admin.from("subscriptions").upsert(
    {
      household_id: householdId,
      stripe_customer_id: customerId,
    },
    { onConflict: "household_id" }
  );

  return NextResponse.json({ url: session.url });
}
