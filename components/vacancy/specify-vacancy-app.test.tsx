import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SpecifyVacancyApp } from "@/components/vacancy/specify-vacancy-app";
import type { Id } from "@/convex/_generated/dataModel";

const mocks = vi.hoisted(() => ({
  authState: "loading",
}));

vi.mock("convex/react", () => ({
  AuthLoading: ({ children }: { children: ReactNode }) =>
    mocks.authState === "loading" ? children : null,
  Authenticated: ({ children }: { children: ReactNode }) =>
    mocks.authState === "authenticated" ? children : null,
  Unauthenticated: ({ children }: { children: ReactNode }) =>
    mocks.authState === "unauthenticated" ? children : null,
  useMutation: () => vi.fn(),
  useQuery: () => undefined,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: ReactNode }) => children,
}));

describe("SpecifyVacancyApp", () => {
  it("shows loading UI while Convex auth is loading", () => {
    render(
      <SpecifyVacancyApp vacancyUnderstandingId={"vacancy-1" as Id<"vacancyUnderstandings">} />,
    );

    expect(screen.queryByText(/sign in to specify this vacancy/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
