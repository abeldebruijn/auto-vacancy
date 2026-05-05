import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VacancyDetailApp } from "@/components/vacancy/vacancy-detail-app";

const apiMock = vi.hoisted(() => ({
  applicationPackage: {
    generateProfilePictureUploadUrl: "generatePackageProfilePictureUploadUrl",
    getByVacancy: "getApplicationPackageByVacancy",
    getOrCreateForVacancy: "getOrCreateApplicationPackageForVacancy",
    setProfilePictureOverride: "setPackageProfilePictureOverride",
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
  applicationPackageData: null as unknown,
  getOrCreateApplicationPackage: vi.fn(),
  packageUploadUrl: vi.fn(),
  profileData: null as unknown,
  setArchived: vi.fn(),
  setPackagePictureOverride: vi.fn(),
  vacancyDetail: null as unknown,
}));

vi.mock("@/convex/_generated/api", () => ({
  api: apiMock,
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  useMutation: (mutation: string) => {
    if (mutation === apiMock.applicationPackage.getOrCreateForVacancy) {
      return mocks.getOrCreateApplicationPackage;
    }
    if (mutation === apiMock.applicationPackage.generateProfilePictureUploadUrl) {
      return mocks.packageUploadUrl;
    }
    if (mutation === apiMock.applicationPackage.setProfilePictureOverride) {
      return mocks.setPackagePictureOverride;
    }
    if (mutation === apiMock.vacancy.setArchived) return mocks.setArchived;
    if (mutation === apiMock.profile.addSkill) return mocks.addSkill;
    return vi.fn();
  },
  useQuery: (query: string) => {
    if (query === apiMock.vacancy.getBySlugId) return mocks.vacancyDetail;
    if (query === apiMock.profile.get) return mocks.profileData;
    if (query === apiMock.applicationPackage.getByVacancy) return mocks.applicationPackageData;
    return null;
  },
}));

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
}));

const vacancyDetail = {
  questions: [],
  requiredSkills: [],
  researchSummaries: [],
  vacancy: {
    _creationTime: 1,
    _id: "vacancy-1",
    companyConfidence: 1,
    companyHomepageUrl: null,
    companyName: "bunq",
    coverLetterAddressee: null,
    createdAt: 1,
    error: null,
    language: "en",
    languageConfidence: 1,
    ownerToken: "owner",
    profileId: "profile-1",
    slug: "bunq",
    status: "ready",
    title: "Frontend Engineer",
    titleConfidence: 1,
    updatedAt: 1,
    vacancyText: "Long vacancy description",
  },
};

const profileData = {
  educations: [],
  experiences: [],
  hobbies: [],
  pictureUrl: "https://example.com/profile.jpg",
  profile: {
    _creationTime: 1,
    _id: "profile-1",
    birthday: null,
    characteristics: [],
    email: null,
    linkedinLink: null,
    name: "Abel de Bruijn",
    nextSteps: [],
    otherDetails: null,
    otherSocialLinks: [],
    ownerToken: "owner",
    phoneNumber: null,
    placeOfResidence: null,
    portfolioLink: null,
    profilePicture: { kind: "url", url: "https://example.com/profile.jpg" },
    updatedAt: 1,
  },
  skills: [],
};

function packageData(profilePictureOverride: { kind: string; url?: string; storageId?: string }) {
  return {
    applicationPackage: {
      _creationTime: 1,
      _id: "package-1",
      createdAt: 1,
      ownerToken: "owner",
      profileId: "profile-1",
      profilePictureOverride,
      updatedAt: 1,
      vacancyUnderstandingId: "vacancy-1",
    },
    pictureUrl:
      profilePictureOverride.kind === "none"
        ? null
        : profilePictureOverride.kind === "url"
          ? profilePictureOverride.url
          : "https://example.com/profile.jpg",
  };
}

describe("VacancyDetailApp Application Package picture controls", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.addSkill.mockReset();
    mocks.getOrCreateApplicationPackage.mockReset();
    mocks.getOrCreateApplicationPackage.mockResolvedValue(packageData({ kind: "inherit" }));
    mocks.packageUploadUrl.mockReset();
    mocks.setArchived.mockReset();
    mocks.setPackagePictureOverride.mockReset();
    mocks.applicationPackageData = packageData({ kind: "inherit" });
    mocks.profileData = profileData;
    mocks.vacancyDetail = vacancyDetail;
  });

  it("shows the inherited Candidate Profile picture by default", () => {
    render(<VacancyDetailApp slugId="bunq-vacancy-1" />);

    expect(screen.getByText("Application Package")).toBeInTheDocument();
    expect(screen.getByText(/Current mode:/)).toHaveTextContent("inherit");
  });

  it("saves URL, clear, and inherit picture modes", async () => {
    render(<VacancyDetailApp slugId="bunq-vacancy-1" />);

    await userEvent.type(
      screen.getByLabelText("Package picture image URL"),
      "https://img.test/me.png",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save URL" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    await userEvent.click(screen.getByRole("button", { name: "Use Candidate Profile" }));

    expect(mocks.setPackagePictureOverride).toHaveBeenNthCalledWith(1, {
      profilePictureOverride: { kind: "url", url: "https://img.test/me.png" },
      vacancyUnderstandingId: "vacancy-1",
    });
    expect(mocks.setPackagePictureOverride).toHaveBeenNthCalledWith(2, {
      profilePictureOverride: { kind: "none" },
      vacancyUnderstandingId: "vacancy-1",
    });
    expect(mocks.setPackagePictureOverride).toHaveBeenNthCalledWith(3, {
      profilePictureOverride: { kind: "inherit" },
      vacancyUnderstandingId: "vacancy-1",
    });
  });

  it("uploads a package-specific profile picture", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ storageId: "storage-1" }),
      ok: true,
    }));
    vi.stubGlobal("fetch", fetchMock);
    mocks.packageUploadUrl.mockResolvedValue("https://upload.test");

    const { container } = render(<VacancyDetailApp slugId="bunq-vacancy-1" />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    await userEvent.upload(input!, new File(["image"], "me.png", { type: "image/png" }));

    await waitFor(() =>
      expect(mocks.setPackagePictureOverride).toHaveBeenCalledWith({
        profilePictureOverride: { kind: "storage", storageId: "storage-1" },
        vacancyUnderstandingId: "vacancy-1",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith("https://upload.test", {
      body: expect.any(File),
      headers: { "Content-Type": "image/png" },
      method: "POST",
    });
  });

  it("creates an Application Package when none exists yet", async () => {
    mocks.applicationPackageData = null;

    render(<VacancyDetailApp slugId="bunq-vacancy-1" />);

    await waitFor(() =>
      expect(mocks.getOrCreateApplicationPackage).toHaveBeenCalledWith({
        vacancyUnderstandingId: "vacancy-1",
      }),
    );
  });
});
