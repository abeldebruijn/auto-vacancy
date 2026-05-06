import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionRefresh } from "@/components/auth/auth-session-refresh";

const mocks = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoaded: true,
  isLoading: false,
  isSignedIn: true,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: mocks.isLoaded,
    isSignedIn: mocks.isSignedIn,
  }),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: mocks.isAuthenticated,
    isLoading: mocks.isLoading,
  }),
}));

describe("AuthSessionRefresh", () => {
  const originalLocation = window.location;
  const reload = vi.fn();

  beforeEach(() => {
    mocks.isAuthenticated = false;
    mocks.isLoaded = true;
    mocks.isLoading = false;
    mocks.isSignedIn = true;
    reload.mockReset();
    window.sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });
  });

  it("reloads once when Clerk is signed in but Convex is unauthenticated", () => {
    render(<AuthSessionRefresh />);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem("auto-vacancy:post-sign-in-refresh")).toBe("done");
  });

  it("does not reload while Convex auth is still loading", () => {
    mocks.isLoading = true;

    render(<AuthSessionRefresh />);

    expect(reload).not.toHaveBeenCalled();
  });

  it("does not reload when Convex is authenticated", () => {
    mocks.isAuthenticated = true;

    render(<AuthSessionRefresh />);

    expect(reload).not.toHaveBeenCalled();
  });

  it("clears the one-shot guard after sign out", () => {
    mocks.isSignedIn = false;
    window.sessionStorage.setItem("auto-vacancy:post-sign-in-refresh", "done");

    render(<AuthSessionRefresh />);

    expect(window.sessionStorage.getItem("auto-vacancy:post-sign-in-refresh")).toBeNull();
  });
});
