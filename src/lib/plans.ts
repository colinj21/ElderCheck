export type PlanId = "free" | "plus" | "family";

export interface PlanDetails {
  id: PlanId;
  name: string;
  price: string;
  priceDetail: string;
  maxRecipients: number | null; // null = unlimited
  features: string[];
}

// The plan catalog. Free is always available. Plus and Family are paid
// tiers backed by Stripe Prices set via env vars once billing is configured.
export const PLANS: PlanDetails[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceDetail: "forever",
    maxRecipients: 1,
    features: [
      "1 loved one",
      "Unlimited caregivers",
      "In-app alerts & concerns",
      "30-day activity history",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "$9",
    priceDetail: "/month",
    maxRecipients: 3,
    features: [
      "Up to 3 loved ones",
      "Unlimited caregivers",
      "Unlimited history",
      "Unlimited family members",
    ],
  },
  {
    id: "family",
    name: "Family",
    price: "$19",
    priceDetail: "/month",
    maxRecipients: null,
    features: [
      "Unlimited loved ones",
      "Unlimited caregivers & family members",
      "Unlimited history",
      "Priority support",
    ],
  },
];

export function getPlanDetails(plan: PlanId): PlanDetails {
  return PLANS.find((p) => p.id === plan) ?? PLANS[0];
}
