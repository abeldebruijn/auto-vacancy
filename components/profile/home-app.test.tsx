import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeApp } from "@/components/profile/home-app";

const mocks = vi.hoisted(() => ({
  importMarkdown: vi.fn(),
  push: vi.fn(),
  queryResult: null as unknown,
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  useAction: () => mocks.importMarkdown,
  useQuery: () => mocks.queryResult,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
}));

describe("HomeApp", () => {
  beforeEach(() => {
    mocks.importMarkdown.mockReset();
    mocks.push.mockReset();
    mocks.queryResult = null;
  });

  it("shows the start profile screen when there is no Candidate Profile", () => {
    render(<HomeApp />);

    expect(screen.getByRole("button", { name: /extract profile from pasted cv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /enter manually/i })).toBeInTheDocument();
  });

  it("shows a welcome message when a Candidate Profile exists", () => {
    mocks.queryResult = { profile: { name: "Abel" } };

    render(<HomeApp />);

    expect(screen.getByText(/your candidate profile is ready/i)).toBeInTheDocument();
    expect(screen.getByText(/vacancy-specific cvs and cover letters/i)).toBeInTheDocument();
  });

  it("routes manual profile creation to /profile", () => {
    render(<HomeApp />);

    fireEvent.click(screen.getByRole("button", { name: /enter manually/i }));

    expect(mocks.push).toHaveBeenCalledWith("/profile");
  });

  it("routes to /profile after extracting a first Candidate Profile", async () => {
    mocks.importMarkdown.mockResolvedValue({ status: "applied" });
    render(<HomeApp />);

    fireEvent.input(screen.getByLabelText(/paste markdown cv/i), {
      target: { value: "# Abel\n\n## Experience\n- Developer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /extract profile from pasted cv/i }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/profile"));
  });
});
