import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import Card from "@/components/ui/Card";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { getEntitlement } from "@/lib/billing/entitlement";

export const metadata = {
  title: "Cover Paused | 24/7 DigiHealth",
};

/**
 * Where a dependant lands when the plan covering them has stopped.
 *
 * Deliberately offers no way to pay. This account is on somebody else's family
 * plan — quite possibly a child's — and the fix is for the plan holder to renew
 * or upgrade, not for the dependant to be handed a card form. Naming them is
 * the whole point of the page: "contact support" would leave someone stuck who
 * only needs to speak to a person they live with.
 */
export default async function CoveragePausedPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const entitlement = await getEntitlement(user.userId);

  // Anyone whose cover is fine, or who never had family cover at all, has no
  // business here — the gate sends them to the right place instead.
  if (entitlement.source !== "family_inactive") {
    redirect(entitlement.hasPlan ? "/patient" : "/patient/checkout");
  }

  const holder = entitlement.coveredBy?.name ?? "your family plan holder";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Card className="max-w-xl p-8 sm:p-10">
        <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 text-warning-700">
          <ShieldAlert size={22} aria-hidden="true" />
        </span>

        <h1 className="text-h2 font-semibold text-ink-900">
          Your cover is paused
        </h1>

        <p className="mt-4 text-body text-ink-600">
          This account is covered by {holder}&rsquo;s family plan, and that plan
          is no longer active. Nothing is owed on your side — there is nothing
          for you to pay.
        </p>

        <p className="mt-4 text-body text-ink-600">
          Ask {holder} to renew the family plan from their own billing page.
          Your appointments, records and messages are all still here, and
          everything comes back the moment the plan is active again.
        </p>

        <div className="mt-8 rounded-lg border border-warning-500/25 bg-warning-50 px-4 py-3">
          <p className="text-small text-warning-700">
            If you would rather not be on this family plan, {holder} can remove
            you from it and you can then take out cover of your own.
          </p>
        </div>
      </Card>
    </div>
  );
}
