import { notFound } from "next/navigation";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { getEntitlement } from "@/lib/billing/entitlement";

/**
 * 404 the billing page for a patient whose bill somebody else pays.
 *
 * A dependant on a guardian's family plan has no invoices, no payment method
 * and no plan to change — everything the portal exists to show belongs to the
 * guardian. Rather than render an empty shell, or worse the guardian's
 * details, the page simply does not exist for them.
 *
 * `notFound()` rather than a redirect because that is what "hide it" means
 * here: bouncing them somewhere pleasant would imply the page is theirs but
 * currently unavailable. The API refuses independently (app/api/billing), so
 * this is the presentation half of the answer, not the enforcement.
 *
 * Only patients are considered. A practitioner or admin reaching the shared
 * portal has their own billing and is left alone.
 */
export async function blockBillingForDependants() {
  const user = await getRequestUser();
  if (!user || user.role !== "patient") return;

  const { source } = await getEntitlement(user.userId);
  if (source === "family" || source === "family_inactive") {
    notFound();
  }
}
