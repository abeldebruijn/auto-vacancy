import { v } from "convex/values";

export const vacancyStatusValidator = v.union(
  v.literal("processing"),
  v.literal("needs_homepage"),
  v.literal("asking_questions"),
  v.literal("ready"),
  v.literal("failed"),
);

export const researchSourceTypeValidator = v.union(
  v.literal("homepage"),
  v.literal("about"),
  v.literal("team"),
  v.literal("wikipedia"),
  v.literal("fallback"),
);

export const requiredSkillKindValidator = v.union(v.literal("soft"), v.literal("hard"));

export const skillMatchStatusValidator = v.union(
  v.literal("matched"),
  v.literal("missing"),
  v.literal("uncertain"),
);

export const researchSummaryInputValidator = v.object({
  sourceType: researchSourceTypeValidator,
  sourceTitle: v.string(),
  sourceUrl: v.string(),
  summary: v.string(),
  confidence: v.number(),
});

export const requiredSkillInputValidator = v.object({
  kind: requiredSkillKindValidator,
  name: v.string(),
  evidence: v.union(v.string(), v.null()),
  matchStatus: skillMatchStatusValidator,
  matchedCandidateSkillIds: v.array(v.id("skills")),
});

export const vacancyQuestionInputValidator = v.object({
  prompt: v.string(),
  shortPrompt: v.string(),
  reason: v.string(),
  required: v.boolean(),
});
