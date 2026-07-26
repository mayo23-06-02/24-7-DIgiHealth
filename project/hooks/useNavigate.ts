"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNavigationProgress } from "@/components/providers/NavigationProgressProvider";

export interface NavigateOptions {
  replace?: boolean;
  scroll?: boolean;
  /** Suppress the global progress bar (e.g. a deliberate query-param sync). */
  silent?: boolean;
}

/**
 * Drop-in replacement for `useRouter().push` that gives feedback.
 *
 * Because the push happens inside `startTransition`, `isPending` stays true for
 * the *whole* App Router transition — including the server round-trip — which
 * is exactly the window a button needs to keep spinning.
 *
 *   const { navigate, isPending } = useNavigate();
 *   <Button loading={isPending} onClick={() => navigate("/patient/doctors")} />
 *
 * For lists, `pendingHref` identifies which row was clicked:
 *
 *   <Button loading={pendingHref === href} onClick={() => navigate(href)} />
 */
export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { start, done } = useNavigationProgress();

  const [lastHref, setLastHref] = useState<string | null>(null);
  const wasPending = useRef(false);

  /* Finisher: the transition settled (covers redirects that keep the pathname). */
  useEffect(() => {
    if (wasPending.current && !isPending) done();
    wasPending.current = isPending;
  }, [isPending, done]);

  // Derived rather than cleared in an effect — a stale href while `isPending`
  // is false is unobservable, since every consumer gates on isPending anyway.
  const pendingHref = isPending ? lastHref : null;

  const navigate = useCallback(
    (href: string, opts: NavigateOptions = {}) => {
      const targetPath = href.startsWith("?")
        ? pathname
        : href.split("?")[0].split("#")[0] || pathname;
      const queryOnly = targetPath === pathname;

      if (!opts.silent && !queryOnly) start();
      setLastHref(href);

      startTransition(() => {
        if (opts.replace) router.replace(href, { scroll: opts.scroll });
        else router.push(href, { scroll: opts.scroll });
      });
    },
    [router, pathname, start],
  );

  const back = useCallback(() => {
    start();
    startTransition(() => router.back());
  }, [router, start]);

  /**
   * Light the progress bar *before* an await, for "fetch then push" flows where
   * the network call is the slow part. Pair with `navigate` for the push, or
   * call `done()` yourself on the failure path.
   */
  const beginNavigation = useCallback(() => start(), [start]);

  return { navigate, back, beginNavigation, done, isPending, pendingHref };
}

export default useNavigate;
