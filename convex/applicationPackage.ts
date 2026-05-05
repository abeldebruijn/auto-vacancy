import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { applicationPackageProfilePictureOverrideValidator } from "./applicationPackageModel";

const applicationPackageOutputValidator = v.object({
  _id: v.id("applicationPackages"),
  _creationTime: v.number(),
  ownerToken: v.string(),
  vacancyUnderstandingId: v.id("vacancyUnderstandings"),
  profileId: v.id("candidateProfiles"),
  profilePictureOverride: applicationPackageProfilePictureOverrideValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

const applicationPackageDataOutputValidator = v.object({
  applicationPackage: applicationPackageOutputValidator,
  pictureUrl: v.union(v.string(), v.null()),
});

async function requireOwnerToken(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Authentication required");
  }
  return identity.tokenIdentifier;
}

async function getOwnedVacancy(
  ctx: QueryCtx | MutationCtx,
  vacancyUnderstandingId: Id<"vacancyUnderstandings">,
  ownerToken: string,
) {
  const vacancy = await ctx.db.get(vacancyUnderstandingId);
  if (vacancy === null || vacancy.ownerToken !== ownerToken) {
    throw new Error("Vacancy Understanding not found");
  }
  return vacancy;
}

async function resolvePictureUrl(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"candidateProfiles">,
  override: Doc<"applicationPackages">["profilePictureOverride"],
) {
  if (override.kind === "none") return null;
  if (override.kind === "url") return override.url;
  if (override.kind === "storage") return await ctx.storage.getUrl(override.storageId);
  if (profile.profilePicture.kind === "storage") {
    return await ctx.storage.getUrl(profile.profilePicture.storageId);
  }
  if (profile.profilePicture.kind === "url") return profile.profilePicture.url;
  return null;
}

async function getOwnedApplicationPackage(
  ctx: QueryCtx | MutationCtx,
  vacancyUnderstandingId: Id<"vacancyUnderstandings">,
  ownerToken: string,
) {
  return await ctx.db
    .query("applicationPackages")
    .withIndex("by_ownerToken_and_vacancyUnderstandingId", (q) =>
      q.eq("ownerToken", ownerToken).eq("vacancyUnderstandingId", vacancyUnderstandingId),
    )
    .unique();
}

export const getByVacancy = query({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: v.union(applicationPackageDataOutputValidator, v.null()),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const applicationPackage = await getOwnedApplicationPackage(
      ctx,
      args.vacancyUnderstandingId,
      ownerToken,
    );
    if (applicationPackage === null) {
      return null;
    }
    const profile = await ctx.db.get(applicationPackage.profileId);
    if (profile === null || profile.ownerToken !== ownerToken) {
      return null;
    }
    return {
      applicationPackage,
      pictureUrl: await resolvePictureUrl(ctx, profile, applicationPackage.profilePictureOverride),
    };
  },
});

export const getOrCreateForVacancy = mutation({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: applicationPackageDataOutputValidator,
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const vacancy = await getOwnedVacancy(ctx, args.vacancyUnderstandingId, ownerToken);
    const profile = await ctx.db.get(vacancy.profileId);
    if (profile === null || profile.ownerToken !== ownerToken) {
      throw new Error("Candidate Profile not found");
    }
    const existing = await getOwnedApplicationPackage(ctx, vacancy._id, ownerToken);
    const now = Date.now();
    const applicationPackage =
      existing ??
      (await ctx.db.insert("applicationPackages", {
        ownerToken,
        vacancyUnderstandingId: vacancy._id,
        profileId: profile._id,
        profilePictureOverride: { kind: "inherit" },
        createdAt: now,
        updatedAt: now,
      }));
    const packageDoc =
      typeof applicationPackage === "string"
        ? await ctx.db.get(applicationPackage)
        : applicationPackage;
    if (packageDoc === null) {
      throw new Error("Application Package not found");
    }
    return {
      applicationPackage: packageDoc,
      pictureUrl: await resolvePictureUrl(ctx, profile, packageDoc.profilePictureOverride),
    };
  },
});

export const setProfilePictureOverride = mutation({
  args: {
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    profilePictureOverride: applicationPackageProfilePictureOverrideValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    await getOwnedVacancy(ctx, args.vacancyUnderstandingId, ownerToken);
    const applicationPackage = await getOwnedApplicationPackage(
      ctx,
      args.vacancyUnderstandingId,
      ownerToken,
    );
    if (applicationPackage === null) {
      throw new Error("Create an Application Package before setting a picture");
    }
    await ctx.db.patch(applicationPackage._id, {
      profilePictureOverride: args.profilePictureOverride,
      updatedAt: Date.now(),
    });
    return null;
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
