import BillingPortal from "./BillingPortal";
import { blockBillingForDependants } from "@/lib/billing/pageGuard";

/**
 * The shared billing portal, for every role that has billing of its own.
 *
 * A thin server component so the guard can run before anything renders — the
 * portal itself is a client component and cannot check who is asking.
 */
export default async function BillingRoute() {
  await blockBillingForDependants();
  return <BillingPortal />;
}
