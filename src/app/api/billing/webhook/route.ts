import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, isBillingConfigured } from "@/lib/billing";
import type Stripe from "stripe";

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  const stripe = getStripeClient()!;
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  async function upsertFromSubscription(subscription: Stripe.Subscription, householdId: string) {
    const status = subscription.status; // active | trialing | past_due | canceled | incomplete | ...
    const plan = status === "active" || status === "trialing" ? "premium" : "free";
    const periodEnd = subscription.items.data[0]?.current_period_end;

    await admin.from("subscriptions").upsert(
      {
        household_id: householdId,
        stripe_customer_id:
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        status,
        plan,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "household_id" }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const householdId = session.client_reference_id;
      if (householdId && session.subscription) {
        const subscription =
          typeof session.subscription === "string"
            ? await stripe.subscriptions.retrieve(session.subscription)
            : session.subscription;
        await upsertFromSubscription(subscription, householdId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const householdId = subscription.metadata?.household_id;
      if (householdId) {
        await upsertFromSubscription(subscription, householdId);
      } else {
        // Fall back to matching on customer id if metadata wasn't set.
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const { data: existing } = await admin
          .from("subscriptions")
          .select("household_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (existing) {
          await upsertFromSubscription(subscription, existing.household_id);
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
