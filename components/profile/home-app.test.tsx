import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeApp } from "@/components/profile/home-app";

const mocks = vi.hoisted(() => ({
  importMarkdown: vi.fn(),
  createVacancy: vi.fn(),
  queryCallCount: 0,
  push: vi.fn(),
  profileQueryResult: null as unknown,
  vacanciesQueryResult: [] as unknown,
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  useAction: () => mocks.importMarkdown,
  useMutation: () => mocks.createVacancy,
  useQuery: () => {
    mocks.queryCallCount += 1;
    return mocks.queryCallCount % 2 === 1 ? mocks.profileQueryResult : mocks.vacanciesQueryResult;
  },
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
    mocks.createVacancy.mockReset();
    mocks.queryCallCount = 0;
    mocks.push.mockReset();
    mocks.profileQueryResult = null;
    mocks.vacanciesQueryResult = [];
  });

  it("shows the start profile screen when there is no Candidate Profile", () => {
    render(<HomeApp />);

    expect(screen.getByRole("button", { name: /extract profile from pasted cv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /enter manually/i })).toBeInTheDocument();
  });

  it("shows the Vacancy entry form when a Candidate Profile exists", () => {
    mocks.profileQueryResult = { profile: { name: "Abel" } };

    render(<HomeApp />);

    expect(screen.getByText(/add a vacancy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vacancy description/i)).toBeInTheDocument();
  });

  it("lists existing Vacancy Understandings", () => {
    mocks.profileQueryResult = { profile: { name: "Abel" } };
    mocks.vacanciesQueryResult = [
      {
        _id: "vac123",
        _creationTime: 1,
        ownerToken: "owner",
        profileId: "profile123",
        vacancyText: "Vacancy text",
        companyName: "Acme",
        companyHomepageUrl: null,
        companyConfidence: 0.9,
        title: "Frontend Developer",
        titleConfidence: 0.9,
        language: "en",
        languageConfidence: 0.9,
        coverLetterAddressee: null,
        status: "ready",
        error: null,
        slug: "acme",
        createdAt: Date.UTC(2026, 0, 2),
        updatedAt: Date.UTC(2026, 0, 2),
      },
    ];

    render(<HomeApp />);

    expect(screen.getByText(/vacancy understandings/i)).toBeInTheDocument();
    expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("creates a Vacancy Understanding from pasted Vacancy text", async () => {
    mocks.profileQueryResult = { profile: { name: "Abel" } };
    mocks.createVacancy.mockResolvedValue("vac123");

    render(<HomeApp />);

    fireEvent.input(screen.getByLabelText(/vacancy description/i), {
      target: {
        value:
          "Acme is hiring a frontend developer to build React interfaces for its customer platform.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /start vacancy understanding/i }));

    await waitFor(() =>
      expect(mocks.createVacancy).toHaveBeenCalledWith({
        vacancyText:
          "Acme is hiring a frontend developer to build React interfaces for its customer platform.",
      }),
    );
    expect(mocks.push).toHaveBeenCalledWith("/specify-vacancy/vac123");
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
