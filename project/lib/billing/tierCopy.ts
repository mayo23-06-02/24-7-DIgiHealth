/**
 * Marketing copy for each plan.
 *
 * Lives here rather than inside the pricing page because checkout shows the
 * same cards. Two copies would have drifted, and a plan described one way on
 * the public site and another at the point of payment is the version of that
 * drift a customer actually notices.
 *
 * Prices and quotas are NOT here — those come from tiers.ts, which the server
 * also charges against.
 */

export type TierCopy = {
  tagline: string;
  highlight?: boolean;
  features: string[];
};

export const TIER_COPY: Record<string, TierCopy> = {
  individual: {
    tagline: "For one person, sorted.",
    features: [
      "Up to 5 consultations a month",
      "Video, chat, or voice with any GP or specialist",
      "E-prescriptions & digital health record",
      "24/7 platform access",
    ],
  },
  family: {
    tagline: "The most popular way to cover a household.",
    highlight: true,
    features: [
      "Up to 10 consultations a month",
      "Add up to 2 family members",
      "Everything in Individual",
      "One login manages the whole family's care",
    ],
  },
  family_plus: {
    tagline: "Unlimited care for bigger families.",
    features: [
      "Unlimited consultations",
      "Add up to 4 family members",
      "Everything in Family",
      "Priority specialist scheduling",
    ],
  },
};
