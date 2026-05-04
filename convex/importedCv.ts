"use node";

import { generateText, Output } from "ai";
import { z } from "zod";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();
const proficiency = z.enum(["low", "medium", "high", "expert"]);

const storySchema = z.object({
  projectName: nullableString,
  situation: nullableString,
  task: nullableString,
  action: nullableString,
  result: nullableString,
});

const experienceSchema = z.object({
  employer: z.string(),
  contractType: z.enum(["full-time", "part-time"]).nullable(),
  isHobbyProject: z.boolean(),
  fromYear: nullableNumber,
  toYear: nullableNumber,
  fromMonth: nullableNumber,
  toMonth: nullableNumber,
  isCurrent: z.boolean(),
  stories: z.array(storySchema),
});

const skillSchema = z.object({
  kind: z.enum(["soft", "hard"]),
  name: z.string(),
  proficiency,
  evidenceExperienceIndexes: z.array(z.number()),
  evidenceStoryRefs: z.array(
    z.object({
      experienceIndex: z.number(),
      storyIndex: z.number(),
    }),
  ),
});

const extractedProfileSchema = z.object({
  name: z.string(),
  birthday: nullableString,
  portfolioLink: nullableString,
  email: nullableString,
  placeOfResidence: nullableString,
  phoneNumber: nullableString,
  linkedinLink: nullableString,
  otherSocialLinks: z.array(z.string()),
  otherDetails: nullableString,
  characteristics: z.array(z.string()),
  nextSteps: z.array(z.string()),
  experiences: z.array(experienceSchema),
  skills: z.array(skillSchema),
  educations: z.array(
    z.object({
      institute: z.string(),
      fromYear: nullableNumber,
      toYear: nullableNumber,
      fromMonth: nullableNumber,
      toMonth: nullableNumber,
      isCurrent: z.boolean(),
      major: nullableString,
      details: nullableString,
    }),
  ),
  hobbies: z.array(
    z.object({
      title: z.string(),
      fromYear: nullableNumber,
      toYear: nullableNumber,
      isCurrent: z.boolean(),
      details: nullableString,
    }),
  ),
});

function toProfileInput(output: z.infer<typeof extractedProfileSchema>) {
  return {
    ...output,
    profilePicture: { kind: "none" as const },
    experiences: output.experiences.map((experience) => ({
      ...experience,
      id: null,
      stories: experience.stories.map((story) => ({ ...story, id: null })),
    })),
    skills: output.skills.map((skill) => ({
      id: null,
      kind: skill.kind,
      name: skill.name,
      proficiency: skill.proficiency,
      experienceIds: [],
      storyIds: [],
    })),
    educations: output.educations.map((education) => ({
      ...education,
      id: null,
    })),
    hobbies: output.hobbies.map((hobby) => ({ ...hobby, id: null })),
  };
}

export const importMarkdown = action({
  args: {
    filename: v.string(),
    markdown: v.string(),
  },
  returns: v.object({
    importedCvId: v.id("importedCvs"),
    status: v.union(v.literal("applied"), v.literal("preview"), v.literal("failed")),
    error: v.union(v.string(), v.null()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    importedCvId: Id<"importedCvs">;
    status: "applied" | "preview" | "failed";
    error: string | null;
  }> => {
    const started: {
      importedCvId: Id<"importedCvs">;
      hasExistingProfile: boolean;
    } = await ctx.runMutation(api.profile.startImport, args);
    try {
      const model = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.5";
      const { output } = await generateText({
        model,
        output: Output.object({
          schema: extractedProfileSchema,
          name: "candidate_profile",
          description: "Candidate Profile facts extracted from an Imported CV.",
        }),
        system:
          "Extract a reusable Candidate Profile from the Imported CV markdown. Preserve the source language for free text. Use null when a field is absent. Only infer facts that are clearly supported by the source.",
        prompt: args.markdown,
      });
      const profile = toProfileInput(output);
      const status = started.hasExistingProfile ? "preview" : "applied";
      await ctx.runMutation(api.profile.finishImport, {
        importedCvId: started.importedCvId,
        status,
        profile,
        error: null,
      });
      return { importedCvId: started.importedCvId, status, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Extraction failed";
      const readableError = errorMessage.includes("Configure AI_GATEWAY_API_KEY")
        ? "AI Gateway is not configured for Convex. Set AI_GATEWAY_API_KEY in Convex environment variables and try again."
        : errorMessage;
      await ctx.runMutation(api.profile.finishImport, {
        importedCvId: started.importedCvId,
        status: "failed",
        profile: null,
        error: readableError,
      });
      return {
        importedCvId: started.importedCvId,
        status: "failed",
        error: readableError,
      };
    }
  },
});
