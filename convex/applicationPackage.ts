import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { cvDraftSnapshotValidator } from "./applicationPackageModel";

const applicationPackageOutputValidator = v.object({
  _id: v.id("applicationPackages"),
  _creationTime: v.number(),
  ownerToken: v.string(),
  vacancyUnderstandingId: v.id("vacancyUnderstandings"),
  profileId: v.id("candidateProfiles"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const cvDraftOutputValidator = v.object({
  _id: v.id("cvDrafts"),
  _creationTime: v.number(),
  ownerToken: v.string(),
  applicationPackageId: v.id("applicationPackages"),
  vacancyUnderstandingId: v.id("vacancyUnderstandings"),
  profileId: v.id("candidateProfiles"),
  snapshot: cvDraftSnapshotValidator,
  revision: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const cvPdfVersionOutputValidator = v.object({
  _id: v.id("cvPdfVersions"),
  _creationTime: v.number(),
  ownerToken: v.string(),
  applicationPackageId: v.id("applicationPackages"),
  cvDraftId: v.id("cvDrafts"),
  vacancyUnderstandingId: v.id("vacancyUnderstandings"),
  profileId: v.id("candidateProfiles"),
  draftRevision: v.number(),
  draftSnapshot: cvDraftSnapshotValidator,
  storageId: v.id("_storage"),
  filename: v.string(),
  generatedAt: v.number(),
  downloadUrl: v.union(v.string(), v.null()),
});

const packageDetailOutputValidator = v.union(
  v.object({
    applicationPackage: applicationPackageOutputValidator,
    cvDraft: v.union(cvDraftOutputValidator, v.null()),
    pdfVersions: v.array(cvPdfVersionOutputValidator),
  }),
  v.null(),
);

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

async function getPackageByVacancy(
  ctx: QueryCtx | MutationCtx,
  ownerToken: string,
  vacancyUnderstandingId: Id<"vacancyUnderstandings">,
) {
  return await ctx.db
    .query("applicationPackages")
    .withIndex("by_ownerToken_and_vacancyUnderstandingId", (q) =>
      q.eq("ownerToken", ownerToken).eq("vacancyUnderstandingId", vacancyUnderstandingId),
    )
    .unique();
}

async function getDraftByPackage(
  ctx: QueryCtx | MutationCtx,
  applicationPackageId: Id<"applicationPackages">,
) {
  return await ctx.db
    .query("cvDrafts")
    .withIndex("by_applicationPackageId", (q) => q.eq("applicationPackageId", applicationPackageId))
    .unique();
}

async function ensurePackage(
  ctx: MutationCtx,
  ownerToken: string,
  vacancyUnderstandingId: Id<"vacancyUnderstandings">,
) {
  const vacancy = await getOwnedVacancy(ctx, vacancyUnderstandingId, ownerToken);
  const existing = await getPackageByVacancy(ctx, ownerToken, vacancyUnderstandingId);
  if (existing !== null) return existing;
  const now = Date.now();
  const applicationPackageId = await ctx.db.insert("applicationPackages", {
    ownerToken,
    vacancyUnderstandingId,
    profileId: vacancy.profileId,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(applicationPackageId);
  if (created === null) {
    throw new Error("Application Package was not created");
  }
  return created;
}

export const getByVacancy = query({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: packageDetailOutputValidator,
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    await getOwnedVacancy(ctx, args.vacancyUnderstandingId, ownerToken);
    const applicationPackage = await getPackageByVacancy(
      ctx,
      ownerToken,
      args.vacancyUnderstandingId,
    );
    if (applicationPackage === null) return null;
    const cvDraft = await getDraftByPackage(ctx, applicationPackage._id);
    const versions = await ctx.db
      .query("cvPdfVersions")
      .withIndex("by_applicationPackageId", (q) =>
        q.eq("applicationPackageId", applicationPackage._id),
      )
      .collect();
    const pdfVersions = await Promise.all(
      versions
        .sort((a, b) => b.generatedAt - a.generatedAt)
        .map(async (version) => ({
          ...version,
          downloadUrl: await ctx.storage.getUrl(version.storageId),
        })),
    );
    return { applicationPackage, cvDraft, pdfVersions };
  },
});

export const saveCvDraft = mutation({
  args: {
    cvDraftId: v.id("cvDrafts"),
    snapshot: cvDraftSnapshotValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const draft = await ctx.db.get(args.cvDraftId);
    if (draft === null || draft.ownerToken !== ownerToken) {
      throw new Error("CV Draft not found");
    }
    const now = Date.now();
    await ctx.db.patch(draft._id, {
      snapshot: normalizeSnapshot(args.snapshot),
      revision: draft.revision + 1,
      updatedAt: now,
    });
    await ctx.db.patch(draft.applicationPackageId, { updatedAt: now });
    return null;
  },
});

export const upsertGeneratedCvDraft = internalMutation({
  args: {
    ownerToken: v.string(),
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    snapshot: cvDraftSnapshotValidator,
    overwrite: v.boolean(),
  },
  returns: v.id("cvDrafts"),
  handler: async (ctx, args) => {
    const applicationPackage = await ensurePackage(
      ctx,
      args.ownerToken,
      args.vacancyUnderstandingId,
    );
    const existing = await getDraftByPackage(ctx, applicationPackage._id);
    if (existing !== null && !args.overwrite) {
      return existing._id;
    }
    const now = Date.now();
    const snapshot = normalizeSnapshot(args.snapshot);
    if (existing === null) {
      const cvDraftId = await ctx.db.insert("cvDrafts", {
        ownerToken: args.ownerToken,
        applicationPackageId: applicationPackage._id,
        vacancyUnderstandingId: applicationPackage.vacancyUnderstandingId,
        profileId: applicationPackage.profileId,
        snapshot,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(applicationPackage._id, { updatedAt: now });
      return cvDraftId;
    }
    await ctx.db.patch(existing._id, {
      snapshot,
      revision: existing.revision + 1,
      updatedAt: now,
    });
    await ctx.db.patch(applicationPackage._id, { updatedAt: now });
    return existing._id;
  },
});

export const createPdfVersion = internalMutation({
  args: {
    ownerToken: v.string(),
    cvDraftId: v.id("cvDrafts"),
    storageId: v.id("_storage"),
    filename: v.string(),
  },
  returns: v.id("cvPdfVersions"),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.cvDraftId);
    if (draft === null || draft.ownerToken !== args.ownerToken) {
      throw new Error("CV Draft not found");
    }
    const now = Date.now();
    const pdfVersionId = await ctx.db.insert("cvPdfVersions", {
      ownerToken: args.ownerToken,
      applicationPackageId: draft.applicationPackageId,
      cvDraftId: draft._id,
      vacancyUnderstandingId: draft.vacancyUnderstandingId,
      profileId: draft.profileId,
      draftRevision: draft.revision,
      draftSnapshot: draft.snapshot,
      storageId: args.storageId,
      filename: args.filename,
      generatedAt: now,
    });
    await ctx.db.patch(draft.applicationPackageId, { updatedAt: now });
    return pdfVersionId;
  },
});

export const getCvDraftForPdf = query({
  args: { cvDraftId: v.id("cvDrafts") },
  returns: v.union(cvDraftOutputValidator, v.null()),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const draft = await ctx.db.get(args.cvDraftId);
    if (draft === null || draft.ownerToken !== ownerToken) return null;
    return draft;
  },
});

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanList(values: string[]) {
  return values.map(clean).filter(Boolean);
}

function cleanParagraph(values: string[]) {
  return cleanList(values).join(" ");
}

function normalizeSnapshot(snapshot: typeof cvDraftSnapshotValidator.type) {
  return {
    ...snapshot,
    name: clean(snapshot.name) || "Untitled Job Seeker",
    title: clean(snapshot.title) || "Job Seeker",
    email: snapshot.email === null ? null : clean(snapshot.email) || null,
    location: snapshot.location === null ? null : clean(snapshot.location) || null,
    links: cleanList(snapshot.links),
    company: clean(snapshot.company) || "Unknown company",
    role: clean(snapshot.role) || "Vacancy",
    accent: clean(snapshot.accent) || "#2563eb",
    summary: snapshot.summary.trim(),
    skills: cleanList(snapshot.skills).slice(0, 7),
    experience: snapshot.experience.map((experience) => ({
      ...experience,
      company: clean(experience.company) || "Untitled experience",
      role: clean(experience.role) || "Experience",
      period: clean(experience.period),
      bullets:
        cleanParagraph(experience.bullets) === "" ? [] : [cleanParagraph(experience.bullets)],
    })),
    education: snapshot.education.map((education) => ({
      ...education,
      school: clean(education.school) || "Untitled education",
      degree: clean(education.degree) || "Education",
      period: clean(education.period),
      details: cleanList(education.details),
    })),
  };
}
