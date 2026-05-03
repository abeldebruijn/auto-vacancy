import { v } from "convex/values";

export const nullableString = v.union(v.string(), v.null());
export const nullableNumber = v.union(v.number(), v.null());

export const pictureValidator = v.union(
  v.object({ kind: v.literal("none") }),
  v.object({ kind: v.literal("url"), url: v.string() }),
  v.object({ kind: v.literal("storage"), storageId: v.id("_storage") }),
);

export const storyInputValidator = v.object({
  id: v.union(v.id("experienceStories"), v.null()),
  projectName: nullableString,
  situation: nullableString,
  task: nullableString,
  action: nullableString,
  result: nullableString,
});

export const experienceInputValidator = v.object({
  id: v.union(v.id("experiences"), v.null()),
  employer: v.string(),
  contractType: v.union(v.literal("full-time"), v.literal("part-time"), v.null()),
  isHobbyProject: v.boolean(),
  fromYear: nullableNumber,
  toYear: nullableNumber,
  fromMonth: nullableNumber,
  toMonth: nullableNumber,
  isCurrent: v.boolean(),
  stories: v.array(storyInputValidator),
});

export const skillInputValidator = v.object({
  id: v.union(v.id("skills"), v.null()),
  kind: v.union(v.literal("soft"), v.literal("hard")),
  name: v.string(),
  proficiency: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("expert"),
  ),
  experienceIds: v.array(v.id("experiences")),
  storyIds: v.array(v.id("experienceStories")),
});

export const educationInputValidator = v.object({
  id: v.union(v.id("educations"), v.null()),
  institute: v.string(),
  fromYear: nullableNumber,
  toYear: nullableNumber,
  fromMonth: nullableNumber,
  toMonth: nullableNumber,
  isCurrent: v.boolean(),
  major: nullableString,
  details: nullableString,
});

export const hobbyInputValidator = v.object({
  id: v.union(v.id("hobbies"), v.null()),
  title: v.string(),
  fromYear: nullableNumber,
  toYear: nullableNumber,
  isCurrent: v.boolean(),
  details: nullableString,
});

export const profileInputValidator = v.object({
  name: v.string(),
  birthday: nullableString,
  portfolioLink: nullableString,
  email: nullableString,
  placeOfResidence: nullableString,
  phoneNumber: nullableString,
  linkedinLink: nullableString,
  otherSocialLinks: v.array(v.string()),
  otherDetails: nullableString,
  characteristics: v.array(v.string()),
  nextSteps: v.array(v.string()),
  profilePicture: pictureValidator,
  experiences: v.array(experienceInputValidator),
  skills: v.array(skillInputValidator),
  educations: v.array(educationInputValidator),
  hobbies: v.array(hobbyInputValidator),
});

export const importedCvStatusValidator = v.union(
  v.literal("processing"),
  v.literal("applied"),
  v.literal("preview"),
  v.literal("failed"),
);
