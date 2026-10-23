"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useNavigationProgress } from "./useNavigationProgress";

export function useProgressRouter() {
  const router = useRouter();
  const { start } = useNavigationProgress();

  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        if (href !== window.location.pathname) {
          start();
        }
        router.push(href, options);
      },
      replace: (
        href: string,
        options?: Parameters<typeof router.replace>[1]
      ) => {
        if (href !== window.location.pathname) {
          start();
        }
        router.replace(href, options);
      },
    }),
    [router, start]
  );
}
