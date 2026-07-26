/**
 * Root fallback for routes outside the (auth) and (dashboard) groups
 * (/, /about, /studio). Those groups define their own loading.tsx.
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}
