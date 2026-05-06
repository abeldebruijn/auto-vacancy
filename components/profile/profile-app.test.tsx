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
  authState: "authenticated",
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
  AuthLoading: ({ children }: { children: ReactNode }) =>
    mocks.authState === "loading" ? children : null,
  Authenticated: ({ children }: { children: ReactNode }) =>
    mocks.authState === "authenticated" ? children : null,
  Unauthenticated: ({ children }: { children: ReactNode }) =>
    mocks.authState === "unauthenticated" ? children : null,
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
    mocks.authState = "authenticated";
    mocks.applyPreview.mockReset();
    mocks.saveProfile.mockReset();
    mocks.uploadUrl.mockReset();
    mocks.setPicture.mockReset();
    mocks.importedCvs = [];
    mocks.profileData = profileData;
  });

  it("shows loading UI while Convex auth is loading", () => {
    mocks.authState = "loading";
    render(<ProfileApp />);

    expect(screen.queryByText(/sign in to build your candidate profile/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("hides Imported CV errors and collapses older history", async () => {
    mocks.importedCvs = [
      {
        _id: "import-3",
        error: null,
        filename: "latest.md",
        markdown: "# Latest CV\n\n- React",
        status: "applied",
      },
      {
        _id: "import-2",
        error: "Unauthenticated. Configure AI_GATEWAY_API_KEY.",
        filename: "older.md",
        markdown: "# Older CV",
        status: "failed",
      },
      {
        _id: "import-1",
        error: "Another hidden error.",
        filename: "oldest.md",
        markdown: "# Oldest CV",
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

  it("opens imported CV markdown in a dialog", async () => {
    mocks.importedCvs = [
      {
        _id: "import-1",
        error: null,
        filename: "latest.md",
        markdown: "# Latest CV\n\n- React",
        status: "applied",
      },
    ];

    render(<ProfileApp />);

    await userEvent.click(screen.getByRole("button", { name: /latest\.mdapplied/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "latest.md" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Latest CV" })).toBeInTheDocument();
    expect(within(dialog).getByText("React")).toBeInTheDocument();
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
    expect(screen.getByText(/1 experience, 1 story/i)).toBeInTheDocument();

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

  it("opens edit dialogs immediately after adding table items", async () => {
    render(<ProfileApp />);

    await userEvent.click(screen.getByRole("button", { name: "Add skill" }));
    expect(screen.getByRole("heading", { name: "Edit skill" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit skill" })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Add education" }));
    expect(screen.getByRole("heading", { name: "Edit education" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit education" })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Add hobby" }));
    expect(screen.getByRole("heading", { name: "Edit hobby" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit hobby" })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Add experience" }));
    expect(screen.getByRole("heading", { name: "Edit experience" })).toBeInTheDocument();
  });

  it("updates skill kind, proficiency, and evidence from inline dropdowns", async () => {
    render(<ProfileApp />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Select skill kind" }));
    fireEvent.click(screen.getByRole("button", { name: "Select skill kind" }));
    await userEvent.click(await screen.findByText("soft"));
    expect(screen.getByRole("button", { name: "Select skill kind" })).toHaveTextContent("soft");

    fireEvent.pointerDown(screen.getByRole("button", { name: "Select skill proficiency" }));
    fireEvent.click(screen.getByRole("button", { name: "Select skill proficiency" }));
    await userEvent.click(await screen.findByText("high"));
    expect(screen.getByRole("button", { name: "Select skill proficiency" })).toHaveTextContent(
      "high",
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Select skill evidence" }));
    fireEvent.click(screen.getByRole("button", { name: "Select skill evidence" }));
    const experienceOption = (await screen.findAllByText("InKaart.nu")).at(-1);
    expect(experienceOption).toBeDefined();
    await userEvent.click(experienceOption!);

    expect(screen.getByRole("button", { name: "Select skill evidence" })).toHaveTextContent(
      "1 story",
    );
  });
});
