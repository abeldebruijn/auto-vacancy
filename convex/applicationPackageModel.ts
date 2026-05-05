import { v } from "convex/values";

export const cvLayoutValidator = v.union(v.literal("compact"), v.literal("flexible"));
export const cvPaperValidator = v.union(v.literal("a4"), v.literal("letter"));

export const cvDraftExperienceValidator = v.object({
  sourceExperienceId: v.union(v.id("experiences"), v.null()),
  company: v.string(),
  role: v.string(),
  period: v.string(),
  bullets: v.array(v.string()),
});

export const cvDraftEducationValidator = v.object({
  sourceEducationId: v.union(v.id("educations"), v.null()),
  school: v.string(),
  degree: v.string(),
  period: v.string(),
  details: v.array(v.string()),
});

export const cvDraftSnapshotValidator = v.object({
  name: v.string(),
  title: v.string(),
  email: v.union(v.string(), v.null()),
  location: v.union(v.string(), v.null()),
  links: v.array(v.string()),
  company: v.string(),
  role: v.string(),
  layout: cvLayoutValidator,
  accent: v.string(),
  paper: cvPaperValidator,
  summary: v.string(),
  skills: v.array(v.string()),
  experience: v.array(cvDraftExperienceValidator),
  education: v.array(cvDraftEducationValidator),
});
