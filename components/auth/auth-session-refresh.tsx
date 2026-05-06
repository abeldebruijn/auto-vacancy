"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";

const REFRESH_KEY = "auto-vacancy:post-sign-in-refresh";

export function AuthSessionRefresh() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      window.sessionStorage.removeItem(REFRESH_KEY);
      return;
    }

    if (isLoading || isAuthenticated || window.sessionStorage.getItem(REFRESH_KEY) === "done") {
      return;
    }

    window.sessionStorage.setItem(REFRESH_KEY, "done");
    window.location.reload();
  }, [isAuthenticated, isLoaded, isLoading, isSignedIn]);

  return null;
}
