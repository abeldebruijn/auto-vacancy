import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VacancyDetailApp } from "@/components/vacancy/vacancy-detail-app";

const apiMock = vi.hoisted(() => ({
  applicationPackage: {
    getByVacancy: "getApplicationPackageByVacancy",
    saveCvDraft: "saveCvDraft",
  },
  applicationPackageAgents: {
    generateCvDraft: "generateCvDraft",
    generateCvPdfVersion: "generateCvPdfVersion",
    regenerateCvDraft: "regenerateCvDraft",
  },
  profile: {
    addSkill: "addSkill",
    get: "getProfile",
  },
  vacancy: {
    getBySlugId: "getVacancyBySlugId",
    setArchived: "setArchived",
  },
}));

const mocks = vi.hoisted(() => ({
  addSkill: vi.fn(),
  generateCvDraft: vi.fn(),
  generateCvPdfVersion: vi.fn(),
  packageDetail: null as unknown,
  profileData: null as unknown,
  regenerateCvDraft: vi.fn(),
  saveCvDraft: vi.fn(),
  setArchived: vi.fn(),
  vacancyDetail: null as unknown,
}));

vi.mock("@/convex/_generated/api", () => ({
  api: apiMock,
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  useAction: (actionName: string) => {
    if (actionName === apiMock.applicationPackageAgents.generateCvDraft)
      return mocks.generateCvDraft;
    if (actionName === apiMock.applicationPackageAgents.regenerateCvDraft) {
      return mocks.regenerateCvDraft;
    }
    if (actionName === apiMock.applicationPackageAgents.generateCvPdfVersion) {
      return mocks.generateCvPdfVersion;
    }
    return vi.fn();
  },
  useMutation: (mutationName: string) => {
    if (mutationName === apiMock.applicationPackage.saveCvDraft) return mocks.saveCvDraft;
    if (mutationName === apiMock.profile.addSkill) return mocks.addSkill;
    if (mutationName === apiMock.vacancy.setArchived) return mocks.setArchived;
    return vi.fn();
  },
  useQuery: (queryName: string) => {
    if (queryName === apiMock.vacancy.getBySlugId) return mocks.vacancyDetail;
    if (queryName === apiMock.applicationPackage.getByVacancy) return mocks.packageDetail;
    if (queryName === apiMock.profile.get) return mocks.profileData;
    return null;
  },
}));

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
}));

const vacancyDetail = {
  vacancy: {
    _id: "vacancy-1",
    _creationTime: 1,
    archivedAt: undefined,
    companyConfidence: 1,
    companyHomepageUrl: "https://example.com",
    companyName: "Acme",
    coverLetterAddressee: null,
    createdAt: 1,
    error: null,
    language: "en",
    languageConfidence: 1,
    ownerToken: "owner",
    profileId: "profile-1",
    slug: "acme",
    status: "ready",
    title: "Frontend Engineer",
    titleConfidence: 1,
    updatedAt: 1,
    vacancyText: "Acme needs a Frontend Engineer.",
  },
  questions: [],
  requiredSkills: [],
  researchSummaries: [],
};

const draftSnapshot = {
  accent: "#2563eb",
  company: "Acme",
  education: [
    {
      sourceEducationId: "education-1",
      degree: "MSc Computer Science",
      details: ["Distributed systems"],
      period: "2020 - 2022",
      school: "University",
    },
  ],
  email: "abel@example.com",
  experience: [
    {
      sourceExperienceId: "experience-1",
      bullets: ["Built React workflows"],
      company: "Inkaart",
      period: "2022 - Present",
      role: "Software Engineer",
    },
  ],
  layout: "compact",
  links: ["https://example.com"],
  location: "Amsterdam",
  name: "Abel de Bruijn",
  paper: "a4",
  role: "Frontend Engineer",
  skills: ["React", "TypeScript"],
  summary: "Frontend engineer focused on product workflows.",
  title: "Software Engineer",
};

describe("VacancyDetailApp Application Package", () => {
  beforeEach(() => {
    mocks.addSkill.mockReset();
    mocks.generateCvDraft.mockReset();
    mocks.generateCvPdfVersion.mockReset();
    mocks.regenerateCvDraft.mockReset();
    mocks.saveCvDraft.mockReset();
    mocks.setArchived.mockReset();
    mocks.vacancyDetail = vacancyDetail;
    mocks.profileData = { experiences: [], skills: [] };
    mocks.packageDetail = null;
  });

  it("generates a CV Draft when no Application Package exists", async () => {
    mocks.generateCvDraft.mockResolvedValue("draft-1");

    render(<VacancyDetailApp slugId="acme-vacancy-1" />);

    expect(screen.getByRole("button", { name: /generate cv draft/i })).toBeInTheDocument();
    expect(screen.queryByText(/json/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /generate cv draft/i }));

    await waitFor(() =>
      expect(mocks.generateCvDraft).toHaveBeenCalledWith({ vacancyUnderstandingId: "vacancy-1" }),
    );
  });

  it("edits and exports an existing CV Draft without exposing JSON", async () => {
    mocks.packageDetail = {
      applicationPackage: {
        _id: "package-1",
        _creationTime: 1,
        createdAt: 1,
        ownerToken: "owner",
        profileId: "profile-1",
        updatedAt: 1,
        vacancyUnderstandingId: "vacancy-1",
      },
      cvDraft: {
        _id: "draft-1",
        _creationTime: 1,
        applicationPackageId: "package-1",
        createdAt: 1,
        ownerToken: "owner",
        profileId: "profile-1",
        revision: 1,
        snapshot: draftSnapshot,
        updatedAt: 1,
        vacancyUnderstandingId: "vacancy-1",
      },
      pdfVersions: [
        {
          _id: "version-1",
          _creationTime: 1,
          applicationPackageId: "package-1",
          cvDraftId: "draft-1",
          downloadUrl: "https://files.example/cv.pdf",
          draftRevision: 1,
          draftSnapshot,
          filename: "cv.pdf",
          generatedAt: Date.UTC(2026, 0, 2),
          ownerToken: "owner",
          profileId: "profile-1",
          storageId: "storage-1",
          vacancyUnderstandingId: "vacancy-1",
        },
      ],
    };
    mocks.saveCvDraft.mockResolvedValue(null);
    mocks.generateCvPdfVersion.mockResolvedValue("version-2");

    render(<VacancyDetailApp slugId="acme-vacancy-1" />);

    fireEvent.change(screen.getByLabelText("Summary"), {
      target: { value: "Updated tailored summary." },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate pdf/i }));

    await waitFor(() =>
      expect(mocks.saveCvDraft).toHaveBeenCalledWith({
        cvDraftId: "draft-1",
        snapshot: expect.objectContaining({ summary: "Updated tailored summary." }),
      }),
    );
    await waitFor(() =>
      expect(mocks.generateCvPdfVersion).toHaveBeenCalledWith({ cvDraftId: "draft-1" }),
    );
    expect(screen.getByText(/latest pdf/i)).toBeInTheDocument();
    expect(screen.queryByText(/json/i)).not.toBeInTheDocument();
  });
});
