/**
 * Single source of truth for subscription pricing and family-member caps.
 * Previously duplicated (and inconsistent) between the Subscription model's
 * own tier enum, app/api/billing/route.ts's pricing table, and BillingTab.tsx's
 * hardcoded TIERS array — all three now read from here.
 */

export type SubscriptionTier = "individual" | "family" | "family_plus";

export interface TierConfig {
  id: SubscriptionTier;
  label: string;
  price: number; // ZAR/month
  consultationsMax: number; // Infinity for unlimited
  /** How many linked family members (not counting the guardian) this tier permits. */
  maxFamilyMembers: number;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  individual: {
    id: "individual",
    label: "Individual",
    price: 250,
    consultationsMax: 5,
    maxFamilyMembers: 0,
  },
  family: {
    id: "family",
    label: "Family",
    price: 500,
    consultationsMax: 10,
    maxFamilyMembers: 2,
  },
  family_plus: {
    id: "family_plus",
    label: "Family Plus",
    price: 1000,
    consultationsMax: Infinity,
    maxFamilyMembers: 4,
  },
};

export const TIER_ORDER: SubscriptionTier[] = ["individual", "family", "family_plus"];

export function isValidTier(tier: string): tier is SubscriptionTier {
  return tier in TIER_CONFIG;
}
