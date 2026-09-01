import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanDetails, type PlanId } from "@/lib/plans";

export type { PlanId, PlanDetails } from "@/lib/plans";
export { PLANS, getPlanDetails } from "@/lib/plans";

function priceIdForPlan(plan: "plus" | "family"): string | undefined {
  return plan === "plus" ? process.env.STRIPE_PRICE_ID_PLUS : process.env.STRIPE_PRICE_ID_FAMILY;
}

function planForPriceId(priceId: string | undefined | null): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_ID_PLUS) return "plus";
  if (priceId === process.env.STRIPE_PRICE_ID_FAMILY) return "family";
  return "free";
}

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      (process.env.STRIPE_PRICE_ID_PLUS || process.env.STRIPE_PRICE_ID_FAMILY)
  );
}

export function isPlanConfigured(plan: "plus" | "family"): boolean {
  return Boolean(priceIdForPlan(plan) && process.env.STRIPE_SECRET_KEY);
}

export { priceIdForPlan, planForPriceId };

export interface HouseholdSubscription {
  plan: PlanId;
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
    plan: data.plan as PlanId,
    status: data.status as HouseholdSubscription["status"],
    currentPeriodEnd: data.current_period_end,
  };
}

function isActivePlan(status: HouseholdSubscription["status"]): boolean {
  return status === "active" || status === "trialing";
}

/** How many more care recipients this household can add on its current plan. Null = unlimited. */
export async function remainingRecipientSlots(householdId: string): Promise<number | null> {
  const sub = await getHouseholdSubscription(householdId);
  const plan = getPlanDetails(isActivePlan(sub.status) ? sub.plan : "free");
  if (plan.maxRecipients === null) return null;

  const admin = createAdminClient();
  const { count } = await admin
    .from("care_recipients")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);

  return Math.max(0, plan.maxRecipients - (count ?? 0));
}

