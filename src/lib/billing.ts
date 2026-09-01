import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Free plan: 1 loved one, unlimited caregivers, in-app alerts, 30-day
// activity visible on the dashboard. Premium unlocks more loved ones,
// unlimited history, and (once built) priority notifications.
export const FREE_PLAN_MAX_RECIPIENTS = 1;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_ID
  );
}

export interface HouseholdSubscription {
  plan: "free" | "premium";
  status: "free" | "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  currentPeriodEnd: string | null;
}

export async function getHouseholdSubscription(householdId: string): Promise<HouseholdSubscription> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("household_id", householdId)
    .maybeSingle();

  if (!data) {
    return { plan: "free", status: "free", currentPeriodEnd: null };
  }

  return {
    plan: data.plan as "free" | "premium",
    status: data.status as HouseholdSubscription["status"],
    currentPeriodEnd: data.current_period_end,
  };
}

export async function isHouseholdPremium(householdId: string): Promise<boolean> {
  const sub = await getHouseholdSubscription(householdId);
  return sub.plan === "premium" && (sub.status === "active" || sub.status === "trialing");
}

/** How many more care recipients this household can add on its current plan. Null = unlimited. */
export async function remainingRecipientSlots(householdId: string): Promise<number | null> {
  const premium = await isHouseholdPremium(householdId);
  if (premium) return null;

  const admin = createAdminClient();
  const { count } = await admin
    .from("care_recipients")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);

  return Math.max(0, FREE_PLAN_MAX_RECIPIENTS - (count ?? 0));
}
