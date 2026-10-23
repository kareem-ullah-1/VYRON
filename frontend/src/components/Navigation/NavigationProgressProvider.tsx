"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

interface NavigationProgressContextType {
  state: "idle" | "loading" | "completing";
  progress: number;
  start: () => void;
  done: () => void;
}

export const NavigationProgressContext =
  createContext<NavigationProgressContextType | null>(null);

export default function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "loading" | "completing">("idle");
  const [progress, setProgress] = useState(0);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const stateRef = useRef(state);
  stateRef.current = state;

  const cleanup = useCallback(() => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  }, []);

  const done = useCallback(() => {
    cleanup();
    setState("completing");
    setProgress(100);

    if (completionRef.current) clearTimeout(completionRef.current);
    completionRef.current = setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 400);
  }, [cleanup]);

  const start = useCallback(() => {
    cleanup();
    if (completionRef.current) {
      clearTimeout(completionRef.current);
      completionRef.current = null;
    }

    setState("loading");
    setProgress(20);

    let p = 20;
    trickleRef.current = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 90) {
        p = 90;
        if (trickleRef.current) clearInterval(trickleRef.current);
      }
      setProgress(p);
    }, 350);

    safetyRef.current = setTimeout(() => {
      done();
    }, 8000);
  }, [cleanup, done]);

  // Use refs for stable callback references in effects
  const startRef = useRef(start);
  const doneRef = useRef(done);
  startRef.current = start;
  doneRef.current = done;

  // Detect navigation end via pathname change
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (stateRef.current === "loading") {
        doneRef.current();
      }
    }
  }, [pathname]);

  // Detect navigation start via click interception
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;

      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
        startRef.current();
      } catch {
        return;
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  // Detect browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      startRef.current();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (completionRef.current) clearTimeout(completionRef.current);
    };
  }, [cleanup]);

  return (
    <NavigationProgressContext.Provider
      value={{ state, progress, start, done }}
    >
      {children}
    </NavigationProgressContext.Provider>
  );
}
