import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { cvDraftSnapshotValidator } from "./applicationPackageModel";
import { profileInputValidator } from "./profileModel";

export default defineSchema({
  candidateProfiles: defineTable({
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
    profilePicture: v.union(
      v.object({ kind: v.literal("none") }),
      v.object({ kind: v.literal("url"), url: v.string() }),
      v.object({ kind: v.literal("storage"), storageId: v.id("_storage") }),
    ),
    updatedAt: v.number(),
  }).index("by_ownerToken", ["ownerToken"]),

  importedCvs: defineTable({
    ownerToken: v.string(),
    profileId: v.union(v.id("candidateProfiles"), v.null()),
    filename: v.string(),
    markdown: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("applied"),
      v.literal("preview"),
      v.literal("failed"),
    ),
    error: v.union(v.string(), v.null()),
    extractedSnapshot: v.union(profileInputValidator, v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ownerToken", ["ownerToken"]),

  experiences: defineTable({
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
  }).index("by_profileId", ["profileId"]),

  experienceStories: defineTable({
    experienceId: v.id("experiences"),
    profileId: v.id("candidateProfiles"),
    ownerToken: v.string(),
    projectName: v.union(v.string(), v.null()),
    situation: v.union(v.string(), v.null()),
    task: v.union(v.string(), v.null()),
    action: v.union(v.string(), v.null()),
    result: v.union(v.string(), v.null()),
    sortOrder: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_experienceId", ["experienceId"]),

  skills: defineTable({
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
  }).index("by_profileId_and_kind", ["profileId", "kind"]),

  educations: defineTable({
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
  }).index("by_profileId", ["profileId"]),

  hobbies: defineTable({
    profileId: v.id("candidateProfiles"),
    ownerToken: v.string(),
    title: v.string(),
    fromYear: v.union(v.number(), v.null()),
    toYear: v.union(v.number(), v.null()),
    isCurrent: v.boolean(),
    details: v.union(v.string(), v.null()),
    sortOrder: v.number(),
  }).index("by_profileId", ["profileId"]),

  vacancyUnderstandings: defineTable({
    ownerToken: v.string(),
    profileId: v.id("candidateProfiles"),
    vacancyText: v.string(),
    companyName: v.union(v.string(), v.null()),
    companyHomepageUrl: v.union(v.string(), v.null()),
    companyConfidence: v.number(),
    title: v.union(v.string(), v.null()),
    titleConfidence: v.number(),
    language: v.union(v.string(), v.null()),
    languageConfidence: v.number(),
    coverLetterAddressee: v.union(v.string(), v.null()),
    status: v.union(
      v.literal("processing"),
      v.literal("needs_homepage"),
      v.literal("asking_questions"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    error: v.union(v.string(), v.null()),
    slug: v.string(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerToken", ["ownerToken"])
    .index("by_ownerToken_and_slug", ["ownerToken", "slug"]),

  vacancyResearchSummaries: defineTable({
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    ownerToken: v.string(),
    sourceType: v.union(
      v.literal("homepage"),
      v.literal("about"),
      v.literal("team"),
      v.literal("wikipedia"),
      v.literal("fallback"),
    ),
    sourceTitle: v.string(),
    sourceUrl: v.string(),
    summary: v.string(),
    confidence: v.number(),
    retrievedAt: v.number(),
  }).index("by_vacancyUnderstandingId", ["vacancyUnderstandingId"]),

  vacancyRequiredSkills: defineTable({
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    ownerToken: v.string(),
    kind: v.union(v.literal("soft"), v.literal("hard")),
    name: v.string(),
    evidence: v.union(v.string(), v.null()),
    matchStatus: v.union(v.literal("matched"), v.literal("missing"), v.literal("uncertain")),
    matchedCandidateSkillIds: v.array(v.id("skills")),
    sortOrder: v.number(),
  }).index("by_vacancyUnderstandingId", ["vacancyUnderstandingId"]),

  vacancyQuestions: defineTable({
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    ownerToken: v.string(),
    prompt: v.string(),
    shortPrompt: v.string(),
    reason: v.string(),
    required: v.boolean(),
    answeredAt: v.union(v.number(), v.null()),
    answer: v.union(v.string(), v.null()),
    sortOrder: v.number(),
  }).index("by_vacancyUnderstandingId", ["vacancyUnderstandingId"]),

  applicationPackages: defineTable({
    ownerToken: v.string(),
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    profileId: v.id("candidateProfiles"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerToken", ["ownerToken"])
    .index("by_ownerToken_and_vacancyUnderstandingId", [
      "ownerToken",
      "vacancyUnderstandingId",
    ]),

  cvDrafts: defineTable({
    ownerToken: v.string(),
    applicationPackageId: v.id("applicationPackages"),
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    profileId: v.id("candidateProfiles"),
    snapshot: cvDraftSnapshotValidator,
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_applicationPackageId", ["applicationPackageId"])
    .index("by_ownerToken_and_vacancyUnderstandingId", [
      "ownerToken",
      "vacancyUnderstandingId",
    ]),

  cvPdfVersions: defineTable({
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
  })
    .index("by_applicationPackageId", ["applicationPackageId"])
    .index("by_ownerToken_and_vacancyUnderstandingId", [
      "ownerToken",
      "vacancyUnderstandingId",
    ]),
});
