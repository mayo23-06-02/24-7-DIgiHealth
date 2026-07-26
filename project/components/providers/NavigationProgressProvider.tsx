"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import TopProgressBar from "@/components/ui/TopProgressBar";

/** Hard ceiling — the bar can never wedge, even if a navigation is cancelled. */
const SAFETY_TIMEOUT_MS = 15_000;
/** Instant (prefetched) navigations shouldn't strobe a one-frame flash. */
const MIN_VISIBLE_MS = 250;

interface NavigationProgressContextValue {
  isNavigating: boolean;
  start: () => void;
  done: () => void;
}

const NavigationProgressContext =
  createContext<NavigationProgressContextValue>({
    isNavigating: false,
    start: () => {},
    done: () => {},
  });

export const useNavigationProgress = () =>
  useContext(NavigationProgressContext);

/**
 * Mounts the global route-change progress bar and detects navigation start.
 *
 * App Router has no navigation-start event: `usePathname` only changes *after*
 * a transition commits, so it can finish the bar but never start it. Start is
 * therefore detected two ways:
 *   1. A document-level click listener on internal <a> elements — covers every
 *      <Link> in the app with zero edits to those files.
 *   2. `useNavigate()` calling `start()` explicitly for programmatic pushes.
 *
 * Deliberately does NOT call `useSearchParams()`: it would fire on every
 * query-only push (see MessagesView's ?chatId= sync) and would force a
 * client-render de-opt of every static route in the app.
 */
export default function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const startedAtRef = useRef(0);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minVisibleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (safetyRef.current) clearTimeout(safetyRef.current);
    if (minVisibleRef.current) clearTimeout(minVisibleRef.current);
    safetyRef.current = null;
    minVisibleRef.current = null;
  }, []);

  const done = useCallback(() => {
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
    setIsNavigating((wasNavigating) => {
      if (!wasNavigating) return false;
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed < MIN_VISIBLE_MS) {
        if (minVisibleRef.current) clearTimeout(minVisibleRef.current);
        minVisibleRef.current = setTimeout(
          () => setIsNavigating(false),
          MIN_VISIBLE_MS - elapsed,
        );
        return true; // hold a beat longer so the bar is actually perceivable
      }
      return false;
    });
  }, []);

  const start = useCallback(() => {
    clearTimers();
    startedAtRef.current = Date.now();
    setIsNavigating(true);
    safetyRef.current = setTimeout(
      () => setIsNavigating(false),
      SAFETY_TIMEOUT_MS,
    );
  }, [clearTimers]);

  /* Finisher: the pathname actually changed, so the transition committed. */
  useEffect(() => {
    done();
    // `done` is stable; keying on pathname only is intentional — see docblock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* Cursor affordance while in flight. */
  useEffect(() => {
    document.documentElement.dataset.navigating = isNavigating
      ? "true"
      : "false";
  }, [isNavigating]);

  /* Start detection for every <Link> / <a> in the app. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Bubble phase, not capture: React attaches its handlers at the root
      // container, so by the time this runs any onClick that called
      // preventDefault() has already done so and we can respect it.
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const a = anchor as HTMLAnchorElement;

      if (a.closest("[data-no-progress]")) return; // explicit opt-out subtree
      if (a.hasAttribute("download")) return;

      const target = a.getAttribute("target");
      if (target && target !== "_self") return; // _blank etc.

      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return; // mailto:, tel:
      if (url.origin !== window.location.origin) return; // external

      // Identical pathname => query-only or hash-only navigation. These never
      // swap the page, so a bar would just strobe (e.g. MessagesView).
      if (url.pathname === window.location.pathname) return;

      start();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [start]);

  /* Back/forward is handled by the browser; just make sure we don't hang. */
  useEffect(() => {
    const onPopState = () => done();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, [done, clearTimers]);

  return (
    <NavigationProgressContext.Provider value={{ isNavigating, start, done }}>
      <TopProgressBar active={isNavigating} />
      {children}
    </NavigationProgressContext.Provider>
  );
}
