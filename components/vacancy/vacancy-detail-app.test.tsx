import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VacancyDetailApp } from "@/components/vacancy/vacancy-detail-app";

const apiMock = vi.hoisted(() => ({
  applicationPackage: {
    generateProfilePictureUploadUrl: "generateProfilePictureUploadUrl",
    getByVacancy: "getApplicationPackageByVacancy",
    getOrCreateForVacancy: "getOrCreateForVacancy",
    saveCvDraft: "saveCvDraft",
    setProfilePictureOverride: "setProfilePictureOverride",
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
    deleteQuestion: "deleteQuestion",
    getBySlugId: "getVacancyBySlugId",
    setArchived: "setArchived",
    updateQuestionAnswer: "updateQuestionAnswer",
  },
}));

const mocks = vi.hoisted(() => ({
  addSkill: vi.fn(),
  authState: "authenticated",
  deleteQuestion: vi.fn(),
  generateCvDraft: vi.fn(),
  generateCvPdfVersion: vi.fn(),
  generateProfilePictureUploadUrl: vi.fn(),
  getOrCreateForVacancy: vi.fn(),
  packageDetail: null as unknown,
  profileData: null as unknown,
  regenerateCvDraft: vi.fn(),
  saveCvDraft: vi.fn(),
  setArchived: vi.fn(),
  setProfilePictureOverride: vi.fn(),
  toast: vi.fn(),
  updateQuestionAnswer: vi.fn(),
  vacancyDetail: null as unknown,
}));

vi.mock("@/convex/_generated/api", () => ({
  api: apiMock,
}));

vi.mock("convex/react", () => ({
  AuthLoading: ({ children }: { children: ReactNode }) =>
    mocks.authState === "loading" ? children : null,
  Authenticated: ({ children }: { children: ReactNode }) =>
    mocks.authState === "authenticated" ? children : null,
  Unauthenticated: ({ children }: { children: ReactNode }) =>
    mocks.authState === "unauthenticated" ? children : null,
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
    if (mutationName === apiMock.applicationPackage.getOrCreateForVacancy) {
      return mocks.getOrCreateForVacancy;
    }
    if (mutationName === apiMock.applicationPackage.generateProfilePictureUploadUrl) {
      return mocks.generateProfilePictureUploadUrl;
    }
    if (mutationName === apiMock.applicationPackage.setProfilePictureOverride) {
      return mocks.setProfilePictureOverride;
    }
    if (mutationName === apiMock.applicationPackage.saveCvDraft) return mocks.saveCvDraft;
    if (mutationName === apiMock.profile.addSkill) return mocks.addSkill;
    if (mutationName === apiMock.vacancy.updateQuestionAnswer) return mocks.updateQuestionAnswer;
    if (mutationName === apiMock.vacancy.deleteQuestion) return mocks.deleteQuestion;
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

vi.mock("sonner", () => ({
  toast: (...args: unknown[]) => mocks.toast(...args),
  Toaster: () => null,
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
    mocks.authState = "authenticated";
    mocks.addSkill.mockReset();
    mocks.deleteQuestion.mockReset();
    mocks.generateCvDraft.mockReset();
    mocks.generateCvPdfVersion.mockReset();
    mocks.generateProfilePictureUploadUrl.mockReset();
    mocks.getOrCreateForVacancy.mockReset();
    mocks.regenerateCvDraft.mockReset();
    mocks.saveCvDraft.mockReset();
    mocks.setArchived.mockReset();
    mocks.setProfilePictureOverride.mockReset();
    mocks.toast.mockReset();
    mocks.updateQuestionAnswer.mockReset();
    mocks.vacancyDetail = vacancyDetail;
    mocks.profileData = { experiences: [], skills: [] };
    mocks.packageDetail = null;
    mocks.getOrCreateForVacancy.mockResolvedValue({
      applicationPackage: {
        _id: "package-1",
        _creationTime: 1,
        createdAt: 1,
        ownerToken: "owner",
        profileId: "profile-1",
        profilePictureOverride: { kind: "inherit" },
        updatedAt: 1,
        vacancyUnderstandingId: "vacancy-1",
      },
      pictureUrl: null,
    });
  });

  it("shows loading UI while Convex auth is loading", () => {
    mocks.authState = "loading";
    render(<VacancyDetailApp slugId="acme-vacancy-1" />);

    expect(screen.queryByText(/sign in to view this vacancy/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
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
        profilePictureOverride: { kind: "inherit" },
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
        {
          _id: "version-0",
          _creationTime: 1,
          applicationPackageId: "package-1",
          cvDraftId: "draft-1",
          downloadUrl: "https://files.example/cv-old.pdf",
          draftRevision: 0,
          draftSnapshot,
          filename: "cv-old.pdf",
          generatedAt: Date.UTC(2026, 0, 1),
          ownerToken: "owner",
          profileId: "profile-1",
          storageId: "storage-0",
          vacancyUnderstandingId: "vacancy-1",
        },
      ],
      pictureUrl: "https://files.example/profile.jpg",
    };
    mocks.profileData = { experiences: [], skills: [{ name: "Accessibility" }] };
    mocks.vacancyDetail = {
      ...vacancyDetail,
      requiredSkills: [{ _id: "skill-1", name: "Next.js", kind: "hard", matchStatus: "missing" }],
    };
    mocks.saveCvDraft.mockResolvedValue(null);
    mocks.generateCvPdfVersion.mockResolvedValue("version-2");

    render(<VacancyDetailApp slugId="acme-vacancy-1" />);

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Location of residence")).toBeInTheDocument();
    expect(screen.getByLabelText("Accent")).toHaveAttribute("type", "color");
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(screen.getByText(/show previous/i)).toBeInTheDocument();
    expect(screen.queryByText(/previous pdf/i)).not.toBeInTheDocument();

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

  it("edits Vacancy Questions and offers to update the Application Package", async () => {
    mocks.packageDetail = {
      applicationPackage: {
        _id: "package-1",
        _creationTime: 1,
        createdAt: 1,
        ownerToken: "owner",
        profileId: "profile-1",
        profilePictureOverride: { kind: "inherit" },
        updatedAt: 1,
        vacancyUnderstandingId: "vacancy-1",
      },
      cvDraft: null,
      pdfVersions: [],
      pictureUrl: null,
    };
    mocks.vacancyDetail = {
      ...vacancyDetail,
      questions: [
        {
          _id: "question-1",
          _creationTime: 1,
          answer: "Old answer",
          answeredAt: 1,
          ownerToken: "owner",
          prompt: "Which frontend project is strongest?",
          reason: "Tailoring",
          required: false,
          shortPrompt: "Strong project",
          sortOrder: 0,
          vacancyUnderstandingId: "vacancy-1",
        },
      ],
    };
    mocks.updateQuestionAnswer.mockResolvedValue(null);

    render(<VacancyDetailApp slugId="acme-vacancy-1" />);

    fireEvent.click(screen.getByRole("button", { name: /edit vacancy question/i }));
    fireEvent.change(screen.getByLabelText("Answer"), {
      target: { value: "  New answer  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /save answer/i }));

    await waitFor(() =>
      expect(mocks.updateQuestionAnswer).toHaveBeenCalledWith({
        questionId: "question-1",
        answer: "  New answer  ",
      }),
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      "Vacancy Questions updated.",
      expect.objectContaining({
        action: expect.objectContaining({ label: "Update Application Package" }),
      }),
    );
  });
});
