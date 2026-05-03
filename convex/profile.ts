import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  importedCvStatusValidator,
  pictureValidator,
  profileInputValidator,
} from "./profileModel";

async function requireOwnerToken(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Authentication required");
  }
  return identity.tokenIdentifier;
}

async function getOwnedProfile(
  ctx: QueryCtx | MutationCtx,
  ownerToken: string,
) {
  return await ctx.db
    .query("candidateProfiles")
    .withIndex("by_ownerToken", (q) => q.eq("ownerToken", ownerToken))
    .unique();
}

async function deleteProfileChildren(
  ctx: MutationCtx,
  profileId: Id<"candidateProfiles">,
) {
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
    existing === null
      ? await ctx.db.insert("candidateProfiles", profileFields)
      : existing._id;

  if (existing !== null) {
    await ctx.db.patch(profileId, profileFields);
    await deleteProfileChildren(ctx, profileId);
  }
  await writeProfileChildren(ctx, profileId, ownerToken, input);
  return profileId;
}

export const get = query({
  args: {},
  returns: v.union(v.any(), v.null()),
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

export const listImportedCvs = query({
  args: {},
  returns: v.array(v.any()),
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
    if (
      importedCv.status !== "preview" ||
      importedCv.extractedSnapshot === null
    ) {
      throw new Error("Imported CV is not ready to apply");
    }
    const profileId = await upsertProfileFromInput(
      ctx,
      ownerToken,
      importedCv.extractedSnapshot as typeof profileInputValidator.type,
    );
    await ctx.db.patch(importedCv._id, {
      profileId,
      status: "applied",
      updatedAt: Date.now(),
    });
    return profileId;
  },
});
