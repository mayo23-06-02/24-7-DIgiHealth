/**
 * Stand-in for a payment gateway.
 *
 * There is no real provider wired up yet. This exists so the checkout flow can
 * be built and tested end to end, and so the swap to a real gateway later is a
 * change in one place rather than throughout the checkout.
 *
 * Outcomes are deterministic rather than random, so a test can reliably
 * exercise both paths.
 */

export type MockCard = {
  number: string;
  name: string;
  expiry: string; // MM/YY
  cvv: string;
};

export type MockPaymentResult =
  | { ok: true; reference: string; last4: string; brand: string }
  | { ok: false; error: string };

/** Card numbers ending in these digits always fail, for testing the sad path. */
const DECLINE_SUFFIXES = ["0000", "0002"];

function digitsOf(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function detectBrand(number: string): string {
  const n = digitsOf(number);
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  return "Card";
}

/** Field-level validation, matching what a real gateway would reject up front. */
export function validateCard(card: MockCard): Record<string, string> {
  const errors: Record<string, string> = {};
  const number = digitsOf(card.number);

  if (number.length < 13 || number.length > 19) {
    errors.number = "Enter a valid card number.";
  }
  if (!card.name?.trim()) {
    errors.name = "Enter the name on the card.";
  }

  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec((card.expiry || "").trim());
  if (!m) {
    errors.expiry = "Use MM/YY.";
  } else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) {
      errors.expiry = "Month must be 01–12.";
    } else {
      // Expiry covers the whole of its month, so compare against the first of
      // the following month.
      const expiresAfter = new Date(year, month, 1);
      if (expiresAfter <= new Date()) errors.expiry = "That card has expired.";
    }
  }

  if (!/^\d{3,4}$/.test(digitsOf(card.cvv))) {
    errors.cvv = "CVV is 3 or 4 digits.";
  }

  return errors;
}

/**
 * Pretend to charge the card. Never throws — a declined payment is an ordinary
 * result, not an exception.
 */
export async function chargeMockCard(
  card: MockCard,
  amount: number,
): Promise<MockPaymentResult> {
  // A little latency so the UI's pending state is real rather than theoretical.
  await new Promise((r) => setTimeout(r, 900));

  const number = digitsOf(card.number);
  const last4 = number.slice(-4);

  if (DECLINE_SUFFIXES.includes(last4)) {
    return { ok: false, error: "Card declined. Try a different card." };
  }
  if (amount <= 0) {
    return { ok: false, error: "Invalid amount." };
  }

  return {
    ok: true,
    reference: `MOCK-${Date.now().toString(36).toUpperCase()}`,
    last4,
    brand: detectBrand(number),
  };
}
