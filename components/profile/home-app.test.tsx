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
    vi.unstubAllGlobals();
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
    expect(screen.getByRole("button", { name: /upload pdf/i })).toBeInTheDocument();
  });

  it("converts an uploaded Vacancy PDF Source into the Vacancy description", async () => {
    mocks.profileQueryResult = { profile: { name: "Abel" } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markdown: "# Frontend Developer\n\nBuild React interfaces." }),
      }),
    );

    render(<HomeApp />);

    const file = new File(["%PDF-1.7"], "vacancy.pdf", { type: "application/pdf" });
    const input = document.querySelector("#vacancy-source-pdf") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByLabelText(/vacancy description/i)).toHaveValue(
        "# Frontend Developer\n\nBuild React interfaces.",
      ),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/vacancy-source/markdown",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
  });

  it("asks before replacing existing Vacancy text with uploaded PDF markdown", async () => {
    mocks.profileQueryResult = { profile: { name: "Abel" } };
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    vi.stubGlobal("fetch", vi.fn());

    render(<HomeApp />);

    fireEvent.input(screen.getByLabelText(/vacancy description/i), {
      target: { value: "Existing Vacancy text that should stay in place." },
    });
    const file = new File(["%PDF-1.7"], "vacancy.pdf", { type: "application/pdf" });
    const input = document.querySelector("#vacancy-source-pdf") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(confirm).toHaveBeenCalledWith(
      "Replace the current Vacancy description with text from this PDF?",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/vacancy description/i)).toHaveValue(
      "Existing Vacancy text that should stay in place.",
    );
  });

  it("keeps Vacancy text unchanged when PDF conversion fails", async () => {
    mocks.profileQueryResult = { profile: { name: "Abel" } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Could not convert this PDF to markdown." }),
      }),
    );

    render(<HomeApp />);

    fireEvent.input(screen.getByLabelText(/vacancy description/i), {
      target: { value: "Existing Vacancy text that should stay in place." },
    });
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const file = new File(["%PDF-1.7"], "vacancy.pdf", { type: "application/pdf" });
    const input = document.querySelector("#vacancy-source-pdf") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText("Could not convert this PDF to markdown.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/vacancy description/i)).toHaveValue(
      "Existing Vacancy text that should stay in place.",
    );
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

  it("converts an uploaded Candidate Profile PDF before importing markdown", async () => {
    mocks.importMarkdown.mockResolvedValue({ status: "applied" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ markdown: "# Abel\n\n## Experience\n- Developer" }),
      }),
    );
    render(<HomeApp />);

    const file = new File(["%PDF-1.7"], "private-cv.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(mocks.importMarkdown).toHaveBeenCalledWith({
        filename: "uploaded-cv.md",
        markdown: "# Abel\n\n## Experience\n- Developer",
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/imported-cv/markdown",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
    expect(mocks.push).toHaveBeenCalledWith("/profile");
  });

  it("shows Candidate Profile PDF conversion errors without importing markdown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Could not convert this PDF to markdown." }),
      }),
    );
    render(<HomeApp />);

    const file = new File(["%PDF-1.7"], "private-cv.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText("Could not convert this PDF to markdown.")).toBeInTheDocument(),
    );
    expect(mocks.importMarkdown).not.toHaveBeenCalled();
  });
});
