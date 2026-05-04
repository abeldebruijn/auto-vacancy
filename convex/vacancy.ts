import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requiredSkillInputValidator,
  researchSummaryInputValidator,
  vacancyQuestionInputValidator,
  vacancyStatusValidator,
} from "./vacancyModel";

const vacancyUnderstandingOutputValidator = v.object({
  _id: v.id("vacancyUnderstandings"),
  _creationTime: v.number(),
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
  status: vacancyStatusValidator,
  error: v.union(v.string(), v.null()),
  slug: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const researchSummaryOutputValidator = v.object({
  _id: v.id("vacancyResearchSummaries"),
  _creationTime: v.number(),
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
});

const requiredSkillOutputValidator = v.object({
  _id: v.id("vacancyRequiredSkills"),
  _creationTime: v.number(),
  vacancyUnderstandingId: v.id("vacancyUnderstandings"),
  ownerToken: v.string(),
  kind: v.union(v.literal("soft"), v.literal("hard")),
  name: v.string(),
  evidence: v.union(v.string(), v.null()),
  matchStatus: v.union(v.literal("matched"), v.literal("missing"), v.literal("uncertain")),
  matchedCandidateSkillIds: v.array(v.id("skills")),
  sortOrder: v.number(),
});

const vacancyQuestionOutputValidator = v.object({
  _id: v.id("vacancyQuestions"),
  _creationTime: v.number(),
  vacancyUnderstandingId: v.id("vacancyUnderstandings"),
  ownerToken: v.string(),
  prompt: v.string(),
  shortPrompt: v.string(),
  reason: v.string(),
  required: v.boolean(),
  answeredAt: v.union(v.number(), v.null()),
  answer: v.union(v.string(), v.null()),
  sortOrder: v.number(),
});

const vacancyDetailOutputValidator = v.object({
  vacancy: vacancyUnderstandingOutputValidator,
  researchSummaries: v.array(researchSummaryOutputValidator),
  requiredSkills: v.array(requiredSkillOutputValidator),
  questions: v.array(vacancyQuestionOutputValidator),
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
    .first();
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

function slugify(value: string | null) {
  const slug = (value ?? "vacancy")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "vacancy";
}

export const create = mutation({
  args: { vacancyText: v.string() },
  returns: v.id("vacancyUnderstandings"),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const profile = await getOwnedProfile(ctx, ownerToken);
    if (profile === null) {
      throw new Error("Create a Candidate Profile before adding a Vacancy");
    }
    const trimmed = args.vacancyText.trim();
    if (trimmed.length < 40) {
      throw new Error("Add a fuller Vacancy description before continuing");
    }
    const now = Date.now();
    return await ctx.db.insert("vacancyUnderstandings", {
      ownerToken,
      profileId: profile._id,
      vacancyText: trimmed,
      companyName: null,
      companyHomepageUrl: null,
      companyConfidence: 0,
      title: null,
      titleConfidence: 0,
      language: null,
      languageConfidence: 0,
      coverLetterAddressee: null,
      status: "processing",
      error: null,
      slug: "vacancy",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const get = query({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: v.union(vacancyDetailOutputValidator, v.null()),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const vacancy = await ctx.db.get(args.vacancyUnderstandingId);
    if (vacancy === null || vacancy.ownerToken !== ownerToken) {
      return null;
    }
    const researchSummaries = await ctx.db
      .query("vacancyResearchSummaries")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))
      .take(20);
    const requiredSkills = await ctx.db
      .query("vacancyRequiredSkills")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))
      .take(200);
    const questions = await ctx.db
      .query("vacancyQuestions")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))
      .take(100);
    return {
      vacancy,
      researchSummaries,
      requiredSkills: requiredSkills.sort((a, b) => a.sortOrder - b.sortOrder),
      questions: questions.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },
});

export const list = query({
  args: {},
  returns: v.array(vacancyUnderstandingOutputValidator),
  handler: async (ctx) => {
    const ownerToken = await requireOwnerToken(ctx);
    const vacancies = await ctx.db
      .query("vacancyUnderstandings")
      .withIndex("by_ownerToken", (q) => q.eq("ownerToken", ownerToken))
      .collect();

    return vacancies.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getBySlugId = query({
  args: { slugId: v.string() },
  returns: v.union(vacancyDetailOutputValidator, v.null()),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const idPart = args.slugId.split("-").at(-1);
    if (idPart === undefined) return null;
    const vacancyUnderstandingId = idPart as Id<"vacancyUnderstandings">;
    const vacancy = await ctx.db.get(vacancyUnderstandingId);
    if (vacancy === null || vacancy.ownerToken !== ownerToken) {
      return null;
    }
    const researchSummaries = await ctx.db
      .query("vacancyResearchSummaries")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))
      .take(20);
    const requiredSkills = await ctx.db
      .query("vacancyRequiredSkills")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))
      .take(200);
    const questions = await ctx.db
      .query("vacancyQuestions")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))
      .take(100);
    return {
      vacancy,
      researchSummaries,
      requiredSkills: requiredSkills.sort((a, b) => a.sortOrder - b.sortOrder),
      questions: questions.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },
});

export const provideHomepage = mutation({
  args: {
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    homepageUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const vacancy = await getOwnedVacancy(ctx, args.vacancyUnderstandingId, ownerToken);
    const homepageUrl = args.homepageUrl.trim();
    if (!/^https?:\/\/.+\..+/.test(homepageUrl)) {
      throw new Error("Provide a full company homepage URL");
    }
    await ctx.db.patch(vacancy._id, {
      companyHomepageUrl: homepageUrl,
      status: "processing",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const answerQuestion = mutation({
  args: {
    questionId: v.id("vacancyQuestions"),
    answer: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const question = await ctx.db.get(args.questionId);
    if (question === null || question.ownerToken !== ownerToken) {
      throw new Error("Question not found");
    }
    const answer = args.answer.trim();
    if (answer === "") {
      throw new Error("Answer cannot be empty");
    }
    await ctx.db.patch(question._id, {
      answer,
      answeredAt: Date.now(),
    });
    return null;
  },
});

export const understandsVacancy = mutation({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const vacancy = await getOwnedVacancy(ctx, args.vacancyUnderstandingId, ownerToken);
    if (vacancy.status === "failed") {
      throw new Error("Vacancy Understanding analysis failed");
    }
    if (vacancy.status === "needs_homepage" || vacancy.status === "processing") {
      throw new Error("Vacancy Understanding is not ready yet");
    }
    const questions = await ctx.db
      .query("vacancyQuestions")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))
      .take(100);
    const blocking = questions.some((question) => question.required && question.answer === null);
    if (blocking) {
      throw new Error("Answer required questions before continuing");
    }
    await ctx.db.patch(vacancy._id, {
      status: "ready",
      updatedAt: Date.now(),
    });
    return `/vacancies/${vacancy.slug}-${vacancy._id}`;
  },
});

export const finishAnalysis = internalMutation({
  args: {
    vacancyUnderstandingId: v.id("vacancyUnderstandings"),
    companyName: v.union(v.string(), v.null()),
    companyHomepageUrl: v.union(v.string(), v.null()),
    companyConfidence: v.number(),
    title: v.union(v.string(), v.null()),
    titleConfidence: v.number(),
    language: v.union(v.string(), v.null()),
    languageConfidence: v.number(),
    coverLetterAddressee: v.union(v.string(), v.null()),
    status: vacancyStatusValidator,
    error: v.union(v.string(), v.null()),
    researchSummaries: v.array(researchSummaryInputValidator),
    requiredSkills: v.array(requiredSkillInputValidator),
    questions: v.array(vacancyQuestionInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerToken = await requireOwnerToken(ctx);
    const vacancy = await getOwnedVacancy(ctx, args.vacancyUnderstandingId, ownerToken);
    for await (const summary of ctx.db
      .query("vacancyResearchSummaries")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))) {
      await ctx.db.delete(summary._id);
    }
    for await (const skill of ctx.db
      .query("vacancyRequiredSkills")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))) {
      await ctx.db.delete(skill._id);
    }
    for await (const question of ctx.db
      .query("vacancyQuestions")
      .withIndex("by_vacancyUnderstandingId", (q) => q.eq("vacancyUnderstandingId", vacancy._id))) {
      await ctx.db.delete(question._id);
    }
    const now = Date.now();
    await ctx.db.patch(vacancy._id, {
      companyName: args.companyName,
      companyHomepageUrl: args.companyHomepageUrl,
      companyConfidence: args.companyConfidence,
      title: args.title,
      titleConfidence: args.titleConfidence,
      language: args.language,
      languageConfidence: args.languageConfidence,
      coverLetterAddressee: args.coverLetterAddressee,
      status: args.status,
      error: args.error,
      slug: slugify(args.companyName ?? args.title),
      updatedAt: now,
    });
    for (const summary of args.researchSummaries) {
      await ctx.db.insert("vacancyResearchSummaries", {
        vacancyUnderstandingId: vacancy._id,
        ownerToken,
        sourceType: summary.sourceType,
        sourceTitle: summary.sourceTitle,
        sourceUrl: summary.sourceUrl,
        summary: summary.summary,
        confidence: summary.confidence,
        retrievedAt: now,
      });
    }
    for (const [sortOrder, skill] of args.requiredSkills.entries()) {
      await ctx.db.insert("vacancyRequiredSkills", {
        vacancyUnderstandingId: vacancy._id,
        ownerToken,
        kind: skill.kind,
        name: skill.name,
        evidence: skill.evidence,
        matchStatus: skill.matchStatus,
        matchedCandidateSkillIds: skill.matchedCandidateSkillIds,
        sortOrder,
      });
    }
    for (const [sortOrder, question] of args.questions.entries()) {
      await ctx.db.insert("vacancyQuestions", {
        vacancyUnderstandingId: vacancy._id,
        ownerToken,
        prompt: question.prompt,
        shortPrompt: question.shortPrompt,
        reason: question.reason,
        required: question.required,
        answeredAt: null,
        answer: null,
        sortOrder,
      });
    }
    return null;
  },
});
