import BillingPortal from "../../billing/BillingPortal";
import { blockBillingForDependants } from "@/lib/billing/pageGuard";

/**
 * Patient billing portal — reuses the unified multi-role billing page
 * (PDF invoices, receipts, and reports).
 *
 * Guarded on both paths rather than only this one: `/billing` is reachable by
 * a signed-in patient too, so protecting only the patient-prefixed URL would
 * leave the same portal one address away.
 */
export default async function PatientBillingRoute() {
  await blockBillingForDependants();
  return <BillingPortal />;
}
