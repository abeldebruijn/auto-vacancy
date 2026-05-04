import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileApp } from "@/components/profile/profile-app";

const apiMock = vi.hoisted(() => ({
  importedCv: {
    importMarkdown: "importMarkdown",
  },
  profile: {
    applyImportedCvPreview: "applyImportedCvPreview",
    generateProfilePictureUploadUrl: "generateProfilePictureUploadUrl",
    get: "getProfile",
    listImportedCvs: "listImportedCvs",
    setPicture: "setPicture",
    update: "updateProfile",
  },
}));

const mocks = vi.hoisted(() => ({
  applyPreview: vi.fn(),
  importedCvs: [] as unknown[],
  profileData: null as unknown,
  saveProfile: vi.fn(),
  uploadUrl: vi.fn(),
  setPicture: vi.fn(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: apiMock,
}));

vi.mock("convex/react", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  useAction: () => vi.fn(),
  useMutation: (mutation: string) => {
    if (mutation === apiMock.profile.applyImportedCvPreview) return mocks.applyPreview;
    if (mutation === apiMock.profile.update) return mocks.saveProfile;
    if (mutation === apiMock.profile.generateProfilePictureUploadUrl) return mocks.uploadUrl;
    if (mutation === apiMock.profile.setPicture) return mocks.setPicture;
    return vi.fn();
  },
  useQuery: (query: string) => {
    if (query === apiMock.profile.get) return mocks.profileData;
    if (query === apiMock.profile.listImportedCvs) return mocks.importedCvs;
    return null;
  },
}));

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
}));

const profileData = {
  pictureUrl: null,
  profile: {
    birthday: null,
    characteristics: [],
    email: null,
    linkedinLink: null,
    name: "Abel de Bruijn",
    nextSteps: [],
    otherDetails: null,
    otherSocialLinks: [],
    phoneNumber: null,
    placeOfResidence: null,
    portfolioLink: null,
    profilePicture: { kind: "none" },
  },
  experiences: [
    {
      _id: "experience-1",
      contractType: "full-time",
      employer: "InKaart.nu",
      fromMonth: 1,
      fromYear: 2024,
      isCurrent: true,
      isHobbyProject: false,
      stories: [
        {
          _id: "story-1",
          action: "Used AI to update the form.",
          projectName: "AI-assisted inspection form generation",
          result: "Saved time.",
          situation: "Inspection forms changed.",
          task: "Create forms quickly.",
        },
      ],
      toMonth: null,
      toYear: null,
    },
  ],
  skills: [
    {
      _id: "skill-1",
      experienceIds: ["experience-1"],
      kind: "hard",
      name: "React",
      proficiency: "expert",
      storyIds: ["story-1"],
    },
  ],
  educations: [
    {
      _id: "education-1",
      details: "Computer Science",
      fromMonth: 9,
      fromYear: 2018,
      institute: "University of Amsterdam",
      isCurrent: false,
      major: "Computer Science",
      toMonth: 7,
      toYear: 2022,
    },
  ],
  hobbies: [
    {
      _id: "hobby-1",
      details: "Building visual tools.",
      fromYear: 2020,
      isCurrent: true,
      title: "Creative coding",
      toYear: null,
    },
  ],
};

describe("ProfileApp", () => {
  beforeEach(() => {
    mocks.applyPreview.mockReset();
    mocks.saveProfile.mockReset();
    mocks.uploadUrl.mockReset();
    mocks.setPicture.mockReset();
    mocks.importedCvs = [];
    mocks.profileData = profileData;
  });

  it("hides Imported CV errors and collapses older history", async () => {
    mocks.importedCvs = [
      { _id: "import-3", error: null, filename: "latest.md", status: "applied" },
      {
        _id: "import-2",
        error: "Unauthenticated. Configure AI_GATEWAY_API_KEY.",
        filename: "older.md",
        status: "failed",
      },
      {
        _id: "import-1",
        error: "Another hidden error.",
        filename: "oldest.md",
        status: "failed",
      },
    ];

    render(<ProfileApp />);

    expect(screen.getByText("latest.md")).toBeInTheDocument();
    expect(screen.queryByText(/AI_GATEWAY_API_KEY/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+2 others before/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /\+2 others before/i }));

    expect(screen.getByText("older.md")).toBeInTheDocument();
    expect(screen.queryByText(/Another hidden error/i)).not.toBeInTheDocument();
  });

  it("renders experiences as a table with Experience Story sub-rows", () => {
    render(<ProfileApp />);

    expect(screen.getByRole("columnheader", { name: "Employer" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: "Period" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Hobby" })).toBeInTheDocument();
    expect(screen.getByText("InKaart.nu")).toBeInTheDocument();
    expect(screen.getByText("2024-01 - Current")).toBeInTheDocument();
    expect(screen.getAllByText(/AI-assisted inspection form generation/i).length).toBeGreaterThan(
      0,
    );
  });

  it("opens edit and add dialogs from experience actions", async () => {
    render(<ProfileApp />);

    fireEvent.pointerDown(screen.getAllByRole("button", { name: "Experience actions" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Experience actions" })[0]);
    await userEvent.click(await screen.findByText("Edit experience"));

    expect(screen.getByRole("heading", { name: "Edit experience" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit experience" })).not.toBeInTheDocument(),
    );

    fireEvent.pointerDown(screen.getAllByRole("button", { name: "Experience actions" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Experience actions" })[0]);
    await userEvent.click(await screen.findByText("Add story"));

    expect(screen.getByRole("heading", { name: "Edit Experience Story" })).toBeInTheDocument();
    expect(screen.getAllByText("Project name").at(-1)).toBeInTheDocument();
  });

  it("confirms and deletes an Experience Story from the draft", async () => {
    render(<ProfileApp />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Experience Story actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Experience Story actions" }));
    await userEvent.click(await screen.findByText("Delete story"));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Delete Experience Story?")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: /delete/i }));

    expect(screen.queryByText(/AI-assisted inspection form generation/i)).not.toBeInTheDocument();
  });

  it("renders Skills, Education, and Hobbies as tables", () => {
    render(<ProfileApp />);

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Kind" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Proficiency" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Evidence" })).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(
      screen.getByText(/InKaart.nu, AI-assisted inspection form generation/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("columnheader", { name: "Institute" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Major" })).toBeInTheDocument();
    expect(screen.getByText("University of Amsterdam")).toBeInTheDocument();
    expect(screen.getByText("2018-09 - 2022-07")).toBeInTheDocument();

    expect(screen.getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Creative coding")).toBeInTheDocument();
    expect(screen.getByText("2020 - Current")).toBeInTheDocument();
  });

  it("opens edit dialogs from Skill, Education, and Hobby actions", async () => {
    render(<ProfileApp />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Skill actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Skill actions" }));
    await userEvent.click(await screen.findByText("Edit skill"));
    expect(screen.getByRole("heading", { name: "Edit skill" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit skill" })).not.toBeInTheDocument(),
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Education actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Education actions" }));
    await userEvent.click(await screen.findByText("Edit education"));
    expect(screen.getByRole("heading", { name: "Edit education" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit education" })).not.toBeInTheDocument(),
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Hobby actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Hobby actions" }));
    await userEvent.click(await screen.findByText("Edit hobby"));
    expect(screen.getByRole("heading", { name: "Edit hobby" })).toBeInTheDocument();
  });
});
