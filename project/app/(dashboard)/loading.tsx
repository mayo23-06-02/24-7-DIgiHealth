import PageSkeleton from "@/components/ui/skeletons/PageSkeleton";

/**
 * Renders in place of {children} INSIDE DashboardShell, so the sidebar and
 * header stay mounted and interactive while only the content column swaps.
 * Catch-all for every dashboard route without its own loading.tsx.
 */
export default function Loading() {
  return <PageSkeleton variant="dashboard" />;
}
