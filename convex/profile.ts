import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { importedCvStatusValidator, pictureValidator, profileInputValidator } from "./profileModel";

const candidateProfileOutputValidator = v.object({
  _id: v.id("candidateProfiles"),
  _creationTime: v.number(),
  ownerToken: v.string(),
  name: v.string(),
  birthday: v.union(v.string(), v.null()),
  portfolioLink: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  placeOfResidence: v.union(v.string(), v.null()),
  phoneNumber: v.union(v.string(), v.null()),
  linkedinLink: v.union(v.string(), v.null()),
  otherSocialLinks: v.array(v.string()),
  otherDetails: v.union(v.string(), v.null()),
  characteristics: v.array(v.string()),
  nextSteps: v.array(v.string()),
  profilePicture: pictureValidator,
  updatedAt: v.number(),
});

const experienceStoryOutputValidator = v.object({
  _id: v.id("experienceStories"),
  _creationTime: v.number(),
  experienceId: v.id("experiences"),
  profileId: v.id("candidateProfiles"),
  ownerToken: v.string(),
  projectName: v.union(v.string(), v.null()),
  situation: v.union(v.string(), v.null()),
  task: v.union(v.string(), v.null()),
  action: v.union(v.string(), v.null()),
  result: v.union(v.string(), v.null()),
  sortOrder: v.number(),
});

const experienceOutputValidator = v.object({
  _id: v.id("experiences"),
  _creationTime: v.number(),
  profileId: v.id("candidateProfiles"),
  ownerToken: v.string(),
  employer: v.string(),
  contractType: v.union(v.literal("full-time"), v.literal("part-time"), v.null()),
  isHobbyProject: v.boolean(),
  fromYear: v.union(v.number(), v.null()),
  toYear: v.union(v.number(), v.null()),
  fromMonth: v.union(v.number(), v.null()),
  toMonth: v.union(v.number(), v.null()),
  isCurrent: v.boolean(),
  sortOrder: v.number(),
  stories: v.array(experienceStoryOutputValidator),
});

const skillOutputValidator = v.object({
  _id: v.id("skills"),
  _creationTime: v.number(),
  profileId: v.id("candidateProfiles"),
  ownerToken: v.string(),
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
  sortOrder: v.number(),
});

const educationOutputValidator = v.object({
  _id: v.id("educations"),
  _creationTime: v.number(),
  profileId: v.id("candidateProfiles"),
  ownerToken: v.string(),
  institute: v.string(),
  fromYear: v.union(v.number(), v.null()),
  toYear: v.union(v.number(), v.null()),
  fromMonth: v.union(v.number(), v.null()),
  toMonth: v.union(v.number(), v.null()),
  isCurrent: v.boolean(),
  major: v.union(v.string(), v.null()),
  details: v.union(v.string(), v.null()),
  sortOrder: v.number(),
});

const hobbyOutputValidator = v.object({
  _id: v.id("hobbies"),
  _creationTime: v.number(),
  profileId: v.id("candidateProfiles"),
  ownerToken: v.string(),
  title: v.string(),
  fromYear: v.union(v.number(), v.null()),
  toYear: v.union(v.number(), v.null()),
  isCurrent: v.boolean(),
  details: v.union(v.string(), v.null()),
  sortOrder: v.number(),
});

const profileDataOutputValidator = v.object({
  profile: candidateProfileOutputValidator,
  pictureUrl: v.union(v.string(), v.null()),
  experiences: v.array(experienceOutputValidator),
  skills: v.array(skillOutputValidator),
  educations: v.array(educationOutputValidator),
  hobbies: v.array(hobbyOutputValidator),
});

const importedCvOutputValidator = v.object({
  _id: v.id("importedCvs"),
  _creationTime: v.number(),
  ownerToken: v.string(),
  profileId: v.union(v.id("candidateProfiles"), v.null()),
  filename: v.string(),
  markdown: v.string(),
  status: importedCvStatusValidator,
  error: v.union(v.string(), v.null()),
  extractedSnapshot: v.union(profileInputValidator, v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

async function requireOwnerToken(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Authentication required");
  }
  return identity.tokenIdentifier;
}

async function getOwnedProfile(ctx: QueryCtx | MutationCtx, ownerToken: string) {
  return await ctx.db
    .query("candidateProfiles")
    .withIndex("by_ownerToken", (q) => q.eq("ownerToken", ownerToken))
    .unique();
}

function assertMonth(value: number | null, fieldName: string) {
  if (value === null) return;
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error(`${fieldName} must be an integer from 1 to 12`);
  }
}

function assertValidProfileMonths(input: typeof profileInputValidator.type) {
  for (const [index, experience] of input.experiences.entries()) {
    assertMonth(experience.fromMonth, `experiences[${index}].fromMonth`);
    assertMonth(experience.toMonth, `experiences[${index}].toMonth`);
  }
  for (const [index, education] of input.educations.entries()) {
    assertMonth(education.fromMonth, `educations[${index}].fromMonth`);
    assertMonth(education.toMonth, `educations[${index}].toMonth`);
  }
}

function assertValidProfileInput(
  input: typeof profileInputValidator.type,
  source: string,
): asserts input is typeof profileInputValidator.type {
  if (
    typeof input !== "object" ||
    input === null ||
    !Array.isArray(input.experiences) ||
    !Array.isArray(input.educations) ||
    !Array.isArray(input.skills) ||
    !Array.isArray(input.hobbies)
  ) {
    throw new Error(`Invalid Candidate Profile snapshot for ${source}`);
  }
  assertValidProfileMonths(input);
}

async function deleteProfileChildren(ctx: MutationCtx, profileId: Id<"candidateProfiles">) {
  for await (const skill of ctx.db
    .query("skills")
    .withIndex("by_profileId_and_kind", (q) => q.eq("profileId", profileId))) {
    await ctx.db.delete(skill._id);
  }
  for await (const story of ctx.db
    .query("experienceStories")
    .withIndex("by_profileId", (q) => q.eq("profileId", profileId))) {
    await ctx.db.delete(story._id);
  }
  for await (const experience of ctx.db
    .query("experiences")
    .withIndex("by_profileId", (q) => q.eq("profileId", profileId))) {
    await ctx.db.delete(experience._id);
  }
  for await (const education of ctx.db
    .query("educations")
    .withIndex("by_profileId", (q) => q.eq("profileId", profileId))) {
    await ctx.db.delete(education._id);
  }
  for await (const hobby of ctx.db
    .query("hobbies")
    .withIndex("by_profileId", (q) => q.eq("profileId", profileId))) {
    await ctx.db.delete(hobby._id);
  }
}

async function writeProfileChildren(
  ctx: MutationCtx,
  profileId: Id<"candidateProfiles">,
  ownerToken: string,
  input: typeof profileInputValidator.type,
) {
  const experienceIdMap = new Map<string, Id<"experiences">>();
  const storyIdMap = new Map<string, Id<"experienceStories">>();

  for (const [sortOrder, experience] of input.experiences.entries()) {
    const experienceId = await ctx.db.insert("experiences", {
      profileId,
      ownerToken,
      employer: experience.employer.trim() || "Untitled experience",
      contractType: experience.contractType,
      isHobbyProject: experience.isHobbyProject,
      fromYear: experience.fromYear,
      toYear: experience.toYear,
      fromMonth: experience.fromMonth,
      toMonth: experience.toMonth,
      isCurrent: experience.isCurrent,
      sortOrder,
    });
    if (experience.id !== null) {
      experienceIdMap.set(experience.id, experienceId);
    }
    for (const [storySortOrder, story] of experience.stories.entries()) {
      const storyId = await ctx.db.insert("experienceStories", {
        experienceId,
        profileId,
        ownerToken,
        projectName: story.projectName,
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
        sortOrder: storySortOrder,
      });
      if (story.id !== null) {
        storyIdMap.set(story.id, storyId);
      }
    }
  }

  for (const [sortOrder, skill] of input.skills.entries()) {
    await ctx.db.insert("skills", {
      profileId,
      ownerToken,
      kind: skill.kind,
      name: skill.name.trim() || "Untitled skill",
      proficiency: skill.proficiency,
      experienceIds: skill.experienceIds
        .map((id) => experienceIdMap.get(id))
        .filter((id): id is Id<"experiences"> => id !== undefined),
      storyIds: skill.storyIds
        .map((id) => storyIdMap.get(id))
        .filter((id): id is Id<"experienceStories"> => id !== undefined),
      sortOrder,
    });
  }

  for (const [sortOrder, education] of input.educations.entries()) {
    await ctx.db.insert("educations", {
      profileId,
      ownerToken,
      institute: education.institute.trim() || "Untitled education",
      fromYear: education.fromYear,
      toYear: education.toYear,
      fromMonth: education.fromMonth,
      toMonth: education.toMonth,
      isCurrent: education.isCurrent,
      major: education.major,
      details: education.details,
      sortOrder,
    });
  }

  for (const [sortOrder, hobby] of input.hobbies.entries()) {
    await ctx.db.insert("hobbies", {
      profileId,
      ownerToken,
      title: hobby.title.trim() || "Untitled hobby",
      fromYear: hobby.fromYear,
      toYear: hobby.toYear,
      isCurrent: hobby.isCurrent,
      details: hobby.details,
      sortOrder,
    });
  }
}

async function upsertProfileFromInput(
  ctx: MutationCtx,
  ownerToken: string,
  input: typeof profileInputValidator.type,
) {
  assertValidProfileInput(input, "write");
  const now = Date.now();
  const existing = await getOwnedProfile(ctx, ownerToken);
  const profileFields = {
    ownerToken,
    name: input.name.trim() || "Untitled Job Seeker",
    birthday: input.birthday,
    portfolioLink: input.portfolioLink,
    email: input.email,
    placeOfResidence: input.placeOfResidence,
    phoneNumber: input.phoneNumber,
    linkedinLink: input.linkedinLink,
    otherSocialLinks: input.otherSocialLinks,
    otherDetails: input.otherDetails,
    characteristics: input.characteristics,
    nextSteps: input.nextSteps,
    profilePicture: input.profilePicture,
    updatedAt: now,
  };

  const profileId =
    existing === null ? await ctx.db.insert("candidateProfiles", profileFields) : existing._id;

  if (existing !== null) {
    await ctx.db.patch(profileId, profileFields);
    await deleteProfileChildren(ctx, profileId);
  }
  await writeProfileChildren(ctx, profileId, ownerToken, input);
  return profileId;
}

export const get = query({
  args: {},
  returns: v.union(profileDataOutputValidator, v.null()),
  handler: async (ctx) => {
    const ownerToken = await requireOwnerToken(ctx);
    const profile = await getOwnedProfile(ctx, ownerToken);
    if (profile === null) {
      return null;
    }
    const experiences = await ctx.db
      .query("experiences")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(200);
    const stories = await ctx.db
      .query("experienceStories")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(500);
    const skills = await ctx.db
      .query("skills")
      .withIndex("by_profileId_and_kind", (q) => q.eq("profileId", profile._id))
      .take(300);
    const educations = await ctx.db
      .query("educations")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(100);
    const hobbies = await ctx.db
      .query("hobbies")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(100);
    const pictureUrl =
      profile.profilePicture.kind === "storage"
        ? await ctx.storage.getUrl(profile.profilePicture.storageId)
        : profile.profilePicture.kind === "url"
          ? profile.profilePicture.url
          : null;

    return {
      profile,
      pictureUrl,
      experiences: experiences
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((experience) => ({
          ...experience,
          stories: stories
            .filter((story) => story.experienceId === experience._id)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        })),
      skills: skills.sort((a, b) => a.sortOrder - b.sortOrder),
      educations: educations.sort((a, b) => a.sortOrder - b.sortOrder),
      hobbies: hobbies.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },
});

export const getForAnalysis = internalQuery({
  args: { ownerToken: v.string() },
  returns: v.union(profileDataOutputValidator, v.null()),
  handler: async (ctx, args) => {
    const profile = await getOwnedProfile(ctx, args.ownerToken);
    if (profile === null) {
      return null;
    }
    const experiences = await ctx.db
      .query("experiences")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(200);
    const stories = await ctx.db
      .query("experienceStories")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(500);
    const skills = await ctx.db
      .query("skills")
      .withIndex("by_profileId_and_kind", (q) => q.eq("profileId", profile._id))
      .take(300);
    const educations = await ctx.db
      .query("educations")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(100);
    const hobbies = await ctx.db
      .query("hobbies")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .take(100);
    const pictureUrl =
      profile.profilePicture.kind === "storage"
        ? await ctx.storage.getUrl(profile.profilePicture.storageId)
        : profile.profilePicture.kind === "url"
          ? profile.profilePicture.url
          : null;

    return {
      profile,
      pictureUrl,
      experiences: experiences
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((experience) => ({
          ...experience,
          stories: stories
            .filter((story) => story.experienceId === experience._id)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        })),
      skills: skills.sort((a, b) => a.sortOrder - b.sortOrder),
      educations: educations.sort((a, b) => a.sortOrder - b.sortOrder),
      hobbies: hobbies.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },
});

export const listImportedCvs = query({
  args: {},
  returns: v.array(importedCvOutputValidator),
  handler: async (ctx) => {
    const ownerToken = await requireOwnerToken(ctx);
    return await ctx.db
      .query("importedCvs")
      .withIndex("by_ownerToken", (q) => q.eq("ownerToken", ownerToken))
      .order("desc")
      .take(20);
  },
});

export const getProfilePictureUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await requireOwnerToken(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const generateProfilePictureUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireOwnerToken(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const update = mutation({
  args: { profile: profileInputValidator },
  returns: v.id("candidateProfiles"),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    return await upsertProfileFromInput(ctx, ownerToken, args.profile);
  },
});

export const setPicture = mutation({
  args: { profilePicture: pictureValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const profile = await getOwnedProfile(ctx, ownerToken);
    if (profile === null) {
      throw new Error("Create a Candidate Profile before setting a picture");
    }
    await ctx.db.patch(profile._id, {
      profilePicture: args.profilePicture,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const startImport = mutation({
  args: { filename: v.string(), markdown: v.string() },
  returns: v.object({
    importedCvId: v.id("importedCvs"),
    hasExistingProfile: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const existing = await getOwnedProfile(ctx, ownerToken);
    const now = Date.now();
    const importedCvId = await ctx.db.insert("importedCvs", {
      ownerToken,
      profileId: existing?._id ?? null,
      filename: args.filename,
      markdown: args.markdown,
      status: "processing",
      error: null,
      extractedSnapshot: null,
      createdAt: now,
      updatedAt: now,
    });
    return { importedCvId, hasExistingProfile: existing !== null };
  },
});

export const finishImport = mutation({
  args: {
    importedCvId: v.id("importedCvs"),
    status: importedCvStatusValidator,
    profile: v.union(profileInputValidator, v.null()),
    error: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const importedCv = await ctx.db.get(args.importedCvId);
    if (importedCv === null || importedCv.ownerToken !== ownerToken) {
      throw new Error("Imported CV not found");
    }
    let profileId = importedCv.profileId;
    if (args.status === "applied" && args.profile !== null) {
      profileId = await upsertProfileFromInput(ctx, ownerToken, args.profile);
    }
    await ctx.db.patch(args.importedCvId, {
      profileId,
      status: args.status,
      error: args.error,
      extractedSnapshot: args.profile,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const applyImportedCvPreview = mutation({
  args: { importedCvId: v.id("importedCvs") },
  returns: v.id("candidateProfiles"),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const importedCv = await ctx.db.get(args.importedCvId);
    if (importedCv === null || importedCv.ownerToken !== ownerToken) {
      throw new Error("Imported CV not found");
    }
    if (importedCv.status !== "preview" || importedCv.extractedSnapshot === null) {
      throw new Error("Imported CV is not ready to apply");
    }
    const snapshot = importedCv.extractedSnapshot;
    assertValidProfileInput(snapshot, `Imported CV ${importedCv._id}`);
    const profileId = await upsertProfileFromInput(ctx, ownerToken, snapshot);
    await ctx.db.patch(importedCv._id, {
      profileId,
      status: "applied",
      updatedAt: Date.now(),
    });
    return profileId;
  },
});
