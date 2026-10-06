import { escapeHtml, renderEmail } from "../layout";

/**
 * "Your plan is active" receipt. The button links to Billing rather than to the PDF: the
 * receipt endpoint requires a session, and a payment record reachable by URL alone does not
 * belong in an inbox.
 */
export function paymentReceiptEmailHtml(params: {
  recipientName?: string;
  planLabel: string;
  amount: number;
  reference: string;
  paidOn: Date;
  nextBillingDate?: Date | null;
  methodLabel: string;
  billingUrl: string;
}): string {
  const { recipientName, planLabel, amount, reference, paidOn, nextBillingDate, methodLabel, billingUrl } = params;
  const money = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(amount || 0);
  const fmt = (d: Date) => d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const details: [string, string][] = [
    ["Plan", planLabel],
    ["Amount paid", money],
    ["Paid on", fmt(paidOn)],
    ["Payment method", methodLabel],
    ["Reference", reference],
  ];
  if (nextBillingDate) details.push(["Next billing date", fmt(nextBillingDate)]);
  return renderEmail({
    preheader: `Payment received: ${money} for your ${planLabel} plan.`,
    eyebrow: "Payment receipt",
    title: "Thank you for your payment",
    icon: "&#129534;",
    greeting: recipientName ? `Dear ${escapeHtml(recipientName)},` : "Hello,",
    paragraphs: [
      `Your payment was successful and your <strong>${escapeHtml(planLabel)}</strong> plan is now active. Here are the details for your records.`,
    ],
    details,
    cta: { label: "View or download your receipt", url: billingUrl },
    notes: [
      "You will need to sign in first. From Billing you can download this receipt as a PDF, which is useful for a medical aid claim.",
      "You can cancel at any time from Billing.",
    ],
  });
}
