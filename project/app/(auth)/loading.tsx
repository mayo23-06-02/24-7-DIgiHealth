import SkeletonLoader from "@/components/ui/SkeletonLoader";

/**
 * Renders inside the (auth) layout's centered container, on top of the
 * auth-wizard background. Mirrors the login/register glass card.
 */
export default function Loading() {
  return (
    <div
      className="w-full max-w-md mx-auto rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl flex flex-col gap-5"
      style={{ padding: 32 }}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col items-center gap-3">
        <SkeletonLoader className="h-12 w-12 rounded-xl" />
        <SkeletonLoader className="h-5 w-40 rounded-md" />
        <SkeletonLoader className="h-3 w-56 max-w-full rounded" />
      </div>

      <div className="flex flex-col gap-4">
        <SkeletonLoader className="h-12 w-full rounded-lg" />
        <SkeletonLoader className="h-12 w-full rounded-lg" />
        <SkeletonLoader className="h-12 w-full rounded-full" />
      </div>

      <div className="flex justify-center">
        <SkeletonLoader className="h-3 w-48 rounded" />
      </div>
    </div>
  );
}
