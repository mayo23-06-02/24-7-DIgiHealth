import { PaymentMethod } from "@/lib/models/Billing";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { subscriptionFilter } from "@/lib/billing/entitlement";
import { apiLogger } from "@/lib/apiLogger";

const scope = "billing/rememberPaymentMethod";

/**
 * What may be kept from a payment, and what may not.
 *
 * Checkout collects a full card number, a CVV and a bank account number, and
 * then threw all of it away — nothing about the instrument was stored, which is
 * why Billing showed "No payment methods saved" to someone who had just paid.
 *
 * The fix is not to start storing what was collected. A PAN or a CVV at rest
 * turns this into a system with cardholder data in it, and the CVV may never be
 * stored after authorisation at all. What is kept here is only what is needed
 * to *recognise* an instrument again: brand, last four, expiry, the holder's
 * name, and the address given alongside it. None of it can be used to charge
 * anything — the gateway reference on the subscription is what does that.
 *
 * Best-effort by design: the money has already moved by the time this runs, so
 * a failure to remember the card must never turn a successful payment into an
 * error the payer sees.
 */
export async function rememberPaymentMethod(input: {
  userId: string;
  method: "card" | "eft";
  /** Raw checkout payload. Only non-sensitive fields are read from it. */
  details: Record<string, unknown>;
  billing: { addressLine?: string; city?: string; postalCode?: string };
  /** From the gateway result — never derived from the number we were sent. */
  brand: string;
  last4: string;
}): Promise<void> {
  try {
    const { userId, method, details, billing, brand, last4 } = input;
    const key = String(userId);

    const expiry = String(details.expiry ?? "");
    const [mm, yy] = expiry.split("/").map((p) => p.trim());
    const expiryMonth = Number(mm);
    // A two-digit year on a card means 20xx; anything else is left unset
    // rather than guessed at.
    const expiryYear = yy?.length === 2 ? 2000 + Number(yy) : Number(yy);

    const holderName =
      method === "card"
        ? String(details.name ?? "").trim()
        : String(details.accountHolder ?? "").trim();

    const common = {
      patientKey: key,
      ...(isMongoObjectId(key) ? { patientId: key } : {}),
      type: method,
      last4,
      holderName: holderName || undefined,
      billingAddress: {
        addressLine: billing?.addressLine?.trim(),
        city: billing?.city?.trim(),
        postalCode: billing?.postalCode?.trim(),
      },
      isDefault: true,
    };

    const specific =
      method === "card"
        ? {
            cardBrand: brand,
            ...(Number.isFinite(expiryMonth) && expiryMonth > 0
              ? { expiryMonth }
              : {}),
            ...(Number.isFinite(expiryYear) && expiryYear > 0
              ? { expiryYear }
              : {}),
          }
        : {
            bankName: String(details.bankName ?? "").trim() || brand,
            branchCode: String(details.branchCode ?? "").trim() || undefined,
            // Deliberately no accountNumber. The last four is enough to tell
            // one account from another, and the full number is not ours to hold.
          };

    // Keyed on the instrument, not on the payment: paying again with the same
    // card should update the record we already have rather than stack up a
    // duplicate for every month of a subscription.
    await PaymentMethod.updateOne(
      { $and: [subscriptionFilter(key), { type: method, last4 }] },
      { $set: { ...common, ...specific } },
      { upsert: true },
    );

    // Exactly one default. Without this, every payment leaves another method
    // claiming to be the default one.
    await PaymentMethod.updateMany(
      {
        $and: [
          subscriptionFilter(key),
          { $nor: [{ type: method, last4 }] },
        ],
      },
      { $set: { isDefault: false } },
    );

    apiLogger.info(scope, "remembered", { method, last4, userId: key });
  } catch (err) {
    apiLogger.warn(scope, "failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
  }
}
