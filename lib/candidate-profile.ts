import type { Id } from "@/convex/_generated/dataModel";

export type Picture =
  | { kind: "none" }
  | { kind: "url"; url: string }
  | { kind: "storage"; storageId: Id<"_storage"> };

export type StoryForm = {
  id: Id<"experienceStories"> | null;
  projectName: string | null;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
};

export type ExperienceForm = {
  id: Id<"experiences"> | null;
  employer: string;
  contractType: "full-time" | "part-time" | null;
  isHobbyProject: boolean;
  fromYear: number | null;
  toYear: number | null;
  fromMonth: number | null;
  toMonth: number | null;
  isCurrent: boolean;
  stories: StoryForm[];
};

export type SkillForm = {
  id: Id<"skills"> | null;
  kind: "soft" | "hard";
  name: string;
  proficiency: "low" | "medium" | "high" | "expert";
  experienceIds: Id<"experiences">[];
  storyIds: Id<"experienceStories">[];
};

export type EducationForm = {
  id: Id<"educations"> | null;
  institute: string;
  fromYear: number | null;
  toYear: number | null;
  fromMonth: number | null;
  toMonth: number | null;
  isCurrent: boolean;
  major: string | null;
  details: string | null;
};

export type HobbyForm = {
  id: Id<"hobbies"> | null;
  title: string;
  fromYear: number | null;
  toYear: number | null;
  isCurrent: boolean;
  details: string | null;
};

export type EvidenceId = Id<"experiences"> | Id<"experienceStories">;

export type EvidenceOptions = {
  experiences: { id: Id<"experiences">; label: string }[];
  stories: { id: Id<"experienceStories">; label: string }[];
};

export type ImportedCvItem = {
  _id: Id<"importedCvs">;
  filename: string;
  status: "processing" | "applied" | "preview" | "failed";
  error: string | null;
};

export type ProfileForm = {
  name: string;
  birthday: string | null;
  portfolioLink: string | null;
  email: string | null;
  placeOfResidence: string | null;
  phoneNumber: string | null;
  linkedinLink: string | null;
  otherSocialLinks: string[];
  otherDetails: string | null;
  characteristics: string[];
  nextSteps: string[];
  profilePicture: Picture;
  experiences: ExperienceForm[];
  skills: SkillForm[];
  educations: EducationForm[];
  hobbies: HobbyForm[];
};

export type ProfileData = {
  profile: Omit<
    ProfileForm,
    "experiences" | "skills" | "educations" | "hobbies"
  >;
  pictureUrl: string | null;
  experiences: (Omit<ExperienceForm, "id" | "stories"> & {
    _id: Id<"experiences">;
    stories: (Omit<StoryForm, "id"> & { _id: Id<"experienceStories"> })[];
  })[];
  skills: (Omit<SkillForm, "id"> & { _id: Id<"skills"> })[];
  educations: (Omit<EducationForm, "id"> & { _id: Id<"educations"> })[];
  hobbies: (Omit<HobbyForm, "id"> & { _id: Id<"hobbies"> })[];
};

export const emptyProfile: ProfileForm = {
  name: "",
  birthday: null,
  portfolioLink: null,
  email: null,
  placeOfResidence: null,
  phoneNumber: null,
  linkedinLink: null,
  otherSocialLinks: [],
  otherDetails: null,
  characteristics: [],
  nextSteps: [],
  profilePicture: { kind: "none" },
  experiences: [],
  skills: [],
  educations: [],
  hobbies: [],
};

export function isMarkdownCvFile(fileName: string) {
  return fileName.toLowerCase().endsWith(".md");
}

export function replaceAt<T>(
  items: T[],
  index: number,
  item: T,
  onChange: (items: T[]) => void,
) {
  onChange(
    items.map((current, currentIndex) =>
      currentIndex === index ? item : current,
    ),
  );
}

export function removeAt<T>(
  items: T[],
  index: number,
  onChange: (items: T[]) => void,
) {
  onChange(items.filter((_, currentIndex) => currentIndex !== index));
}

export function newStory(): StoryForm {
  return {
    id: null,
    projectName: null,
    situation: null,
    task: null,
    action: null,
    result: null,
  };
}

export function newExperience(): ExperienceForm {
  return {
    id: null,
    employer: "",
    contractType: null,
    isHobbyProject: false,
    fromYear: null,
    toYear: null,
    fromMonth: null,
    toMonth: null,
    isCurrent: false,
    stories: [newStory()],
  };
}

export function newSkill(kind: "soft" | "hard"): SkillForm {
  return {
    id: null,
    kind,
    name: "",
    proficiency: "medium",
    experienceIds: [],
    storyIds: [],
  };
}

export function newEducation(): EducationForm {
  return {
    id: null,
    institute: "",
    fromYear: null,
    toYear: null,
    fromMonth: null,
    toMonth: null,
    isCurrent: false,
    major: null,
    details: null,
  };
}

export function newHobby(): HobbyForm {
  return {
    id: null,
    title: "",
    fromYear: null,
    toYear: null,
    isCurrent: false,
    details: null,
  };
}

export function fromProfileData(data: ProfileData): ProfileForm {
  return {
    name: data.profile.name,
    birthday: data.profile.birthday,
    portfolioLink: data.profile.portfolioLink,
    email: data.profile.email,
    placeOfResidence: data.profile.placeOfResidence,
    phoneNumber: data.profile.phoneNumber,
    linkedinLink: data.profile.linkedinLink,
    otherSocialLinks: data.profile.otherSocialLinks,
    otherDetails: data.profile.otherDetails,
    characteristics: data.profile.characteristics,
    nextSteps: data.profile.nextSteps,
    profilePicture: data.profile.profilePicture,
    experiences: data.experiences.map((experience) => ({
      id: experience._id,
      employer: experience.employer,
      contractType: experience.contractType,
      isHobbyProject: experience.isHobbyProject,
      fromYear: experience.fromYear,
      toYear: experience.toYear,
      fromMonth: experience.fromMonth,
      toMonth: experience.toMonth,
      isCurrent: experience.isCurrent,
      stories: experience.stories.map((story) => ({
        id: story._id,
        projectName: story.projectName,
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
      })),
    })),
    skills: data.skills.map((skill) => ({
      id: skill._id,
      kind: skill.kind,
      name: skill.name,
      proficiency: skill.proficiency,
      experienceIds: skill.experienceIds,
      storyIds: skill.storyIds,
    })),
    educations: data.educations.map((education) => ({
      id: education._id,
      institute: education.institute,
      fromYear: education.fromYear,
      toYear: education.toYear,
      fromMonth: education.fromMonth,
      toMonth: education.toMonth,
      isCurrent: education.isCurrent,
      major: education.major,
      details: education.details,
    })),
    hobbies: data.hobbies.map((hobby) => ({
      id: hobby._id,
      title: hobby.title,
      fromYear: hobby.fromYear,
      toYear: hobby.toYear,
      isCurrent: hobby.isCurrent,
      details: hobby.details,
    })),
  };
}

function cleanString(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function normalizeForm(form: ProfileForm) {
  return {
    ...form,
    name: form.name.trim() || "Untitled Job Seeker",
    birthday: cleanString(form.birthday),
    portfolioLink: cleanString(form.portfolioLink),
    email: cleanString(form.email),
    placeOfResidence: cleanString(form.placeOfResidence),
    phoneNumber: cleanString(form.phoneNumber),
    linkedinLink: cleanString(form.linkedinLink),
    otherSocialLinks: form.otherSocialLinks
      .map((value) => value.trim())
      .filter(Boolean),
    otherDetails: cleanString(form.otherDetails),
    characteristics: form.characteristics
      .map((value) => value.trim())
      .filter(Boolean),
    nextSteps: form.nextSteps.map((value) => value.trim()).filter(Boolean),
    experiences: form.experiences.map((experience) => ({
      ...experience,
      employer: experience.employer.trim() || "Untitled experience",
      stories: experience.stories.map((story) => ({
        ...story,
        projectName: cleanString(story.projectName),
        situation: cleanString(story.situation),
        task: cleanString(story.task),
        action: cleanString(story.action),
        result: cleanString(story.result),
      })),
    })),
    skills: form.skills.map((skill) => ({
      ...skill,
      name: skill.name.trim() || "Untitled skill",
    })),
    educations: form.educations.map((education) => ({
      ...education,
      institute: education.institute.trim() || "Untitled education",
      major: cleanString(education.major),
      details: cleanString(education.details),
    })),
    hobbies: form.hobbies.map((hobby) => ({
      ...hobby,
      title: hobby.title.trim() || "Untitled hobby",
      details: cleanString(hobby.details),
    })),
  };
}
