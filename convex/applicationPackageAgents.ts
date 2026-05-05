"use node";

import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { generateText, Output } from "ai";
import { z } from "zod";
import { v } from "convex/values";
import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { cvDraftSnapshotValidator } from "./applicationPackageModel";

const MAX_CV_SKILLS = 7;

const cvDraftAiSchema = z.object({
  summary: z.string(),
  skills: z.array(z.string()).max(MAX_CV_SKILLS),
  experience: z
    .array(
      z.object({
        sourceExperienceId: z.string().nullable(),
        company: z.string(),
        role: z.string(),
        period: z.string(),
        bullets: z.array(z.string()).max(6),
      }),
    )
    .max(8),
  education: z
    .array(
      z.object({
        sourceEducationId: z.string().nullable(),
        school: z.string(),
        degree: z.string(),
        period: z.string(),
        details: z.array(z.string()).max(6),
      }),
    )
    .max(5),
});

type CandidateProfileData = {
  profile: Doc<"candidateProfiles">;
  pictureUrl: string | null;
  experiences: (Doc<"experiences"> & { stories: Doc<"experienceStories">[] })[];
  skills: Doc<"skills">[];
  educations: Doc<"educations">[];
  hobbies: Doc<"hobbies">[];
} | null;

type VacancyDetail = {
  vacancy: Doc<"vacancyUnderstandings">;
  researchSummaries: Doc<"vacancyResearchSummaries">[];
  requiredSkills: Doc<"vacancyRequiredSkills">[];
  questions: Doc<"vacancyQuestions">[];
} | null;
type CvDraftSnapshot = typeof cvDraftSnapshotValidator.type;

async function requireOwnerToken(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Authentication required");
  }
  return identity.tokenIdentifier;
}

function modelId() {
  return process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.5";
}

function aiDraftErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : "Unknown AI generation error";
}

function period(args: {
  fromYear: number | null;
  fromMonth?: number | null;
  toYear: number | null;
  toMonth?: number | null;
  isCurrent: boolean;
}) {
  const from = yearMonth(args.fromYear, args.fromMonth ?? null);
  const to = args.isCurrent ? "Present" : yearMonth(args.toYear, args.toMonth ?? null);
  if (from === "" && to === "") return "";
  if (from === "") return to;
  if (to === "") return from;
  return `${from} - ${to}`;
}

function yearMonth(year: number | null, month: number | null) {
  if (year === null) return "";
  if (month === null) return `${year}`;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function topSkills(values: string[]) {
  return values
    .map(clean)
    .filter(Boolean)
    .filter((skill, index, all) => all.findIndex((item) => item.toLowerCase() === skill.toLowerCase()) === index)
    .slice(0, MAX_CV_SKILLS);
}

function splitDetails(value: string | null) {
  return (value ?? "")
    .split(/\n|•|-/)
    .map(clean)
    .filter(Boolean);
}

function storyBullets(
  stories: NonNullable<CandidateProfileData>["experiences"][number]["stories"],
) {
  return stories
    .flatMap((story) => [
      story.action,
      story.result,
      story.task !== null && story.result !== null ? `${story.task}: ${story.result}` : null,
    ])
    .filter((value): value is string => value !== null)
    .map(clean)
    .filter(Boolean)
    .slice(0, 4);
}

function buildFallbackDraft(
  detail: NonNullable<VacancyDetail>,
  profileData: NonNullable<CandidateProfileData>,
): CvDraftSnapshot {
  const company = detail.vacancy.companyName ?? "Unknown company";
  const role = detail.vacancy.title ?? "Vacancy";
  const requiredSkillNames = detail.requiredSkills.map((skill) => skill.name);
  const profileSkillNames = profileData.skills.map((skill) => skill.name);
  const skills = topSkills([...requiredSkillNames, ...profileSkillNames]);

  return {
    name: profileData.profile.name,
    title: role,
    email: profileData.profile.email,
    location: profileData.profile.placeOfResidence,
    links: [
      profileData.profile.portfolioLink,
      profileData.profile.linkedinLink,
      ...profileData.profile.otherSocialLinks,
    ].filter((value): value is string => value !== null && clean(value) !== ""),
    company,
    role,
    layout: "compact" as const,
    accent: "#2563eb",
    paper: "a4" as const,
    summary:
      `Tailored application for ${role} at ${company}. ` +
      profileData.profile.characteristics.slice(0, 3).join(" "),
    skills,
    experience: profileData.experiences.slice(0, 4).map((experience) => ({
      sourceExperienceId: experience._id,
      company: experience.employer,
      role: experience.isHobbyProject ? "Hobby project" : "Experience",
      period: period(experience),
      bullets: storyBullets(experience.stories),
    })),
    education: profileData.educations.slice(0, 3).map((education) => ({
      sourceEducationId: education._id,
      school: education.institute,
      degree: education.major ?? "Education",
      period: period(education),
      details: splitDetails(education.details),
    })),
  };
}

function coerceExperienceId(
  value: string | null,
  profileData: NonNullable<CandidateProfileData>,
): Id<"experiences"> | null {
  if (value === null) return null;
  return profileData.experiences.some((experience) => experience._id === value)
    ? (value as Id<"experiences">)
    : null;
}

function coerceEducationId(
  value: string | null,
  profileData: NonNullable<CandidateProfileData>,
): Id<"educations"> | null {
  if (value === null) return null;
  return profileData.educations.some((education) => education._id === value)
    ? (value as Id<"educations">)
    : null;
}

function applyAiDraft(
  base: CvDraftSnapshot,
  aiDraft: z.infer<typeof cvDraftAiSchema>,
  profileData: NonNullable<CandidateProfileData>,
): CvDraftSnapshot {
  return {
    ...base,
    summary: aiDraft.summary,
    skills: topSkills(aiDraft.skills),
    experience: aiDraft.experience.map((experience) => ({
      sourceExperienceId: coerceExperienceId(experience.sourceExperienceId, profileData),
      company: experience.company,
      role: experience.role,
      period: experience.period,
      bullets: experience.bullets,
    })),
    education: aiDraft.education.map((education) => ({
      sourceEducationId: coerceEducationId(education.sourceEducationId, profileData),
      school: education.school,
      degree: education.degree,
      period: education.period,
      details: education.details,
    })),
  };
}

async function buildAiDraft(
  detail: NonNullable<VacancyDetail>,
  profileData: NonNullable<CandidateProfileData>,
  fallback: CvDraftSnapshot,
) {
  const profileContext = JSON.stringify(
    {
      profile: {
        name: profileData.profile.name,
        characteristics: profileData.profile.characteristics,
        nextSteps: profileData.profile.nextSteps,
      },
      skills: profileData.skills,
      experiences: profileData.experiences,
      educations: profileData.educations,
      hobbies: profileData.hobbies,
    },
    null,
    2,
  );
  const vacancyContext = JSON.stringify(
    {
      vacancy: detail.vacancy,
      researchSummaries: detail.researchSummaries,
      requiredSkills: detail.requiredSkills,
      questions: detail.questions,
    },
    null,
    2,
  );
  const { output } = await generateText({
    model: modelId(),
    maxRetries: 1,
    timeout: { totalMs: 90000 },
    output: Output.object({
      schema: cvDraftAiSchema,
      name: "cv_draft",
      description: "Vacancy-specific CV Draft content for a Job Seeker.",
    }),
    system:
      "Create a concise, truthful CV Draft from the Candidate Profile and Vacancy Understanding. Use only supported facts. Rank the Vacancy required skills against the Candidate Profile and return only the top 7 most relevant skill labels. Do not return more than 7 skills, do not include broad duplicates, and do not pack multiple skills into one long skill item. Select the most relevant experiences and education. Write each experience as one compact story paragraph, returned as a single bullets item for compatibility. Preserve the Vacancy language when possible. Return source ids when selecting existing profile entries.",
    prompt: `Candidate Profile:\n${profileContext}\n\nVacancy Understanding:\n${vacancyContext}`,
  });
  return applyAiDraft(fallback, output, profileData);
}

export const generateCvDraft = action({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: v.id("cvDrafts"),
  handler: async (ctx, args): Promise<Id<"cvDrafts">> => {
    const ownerToken = await requireOwnerToken(ctx);
    const detail: VacancyDetail = await ctx.runQuery(internal.vacancy.getForAnalysis, {
      vacancyUnderstandingId: args.vacancyUnderstandingId,
      ownerToken,
    });
    const profileData: CandidateProfileData = await ctx.runQuery(internal.profile.getForAnalysis, {
      ownerToken,
    });
    if (detail === null || profileData === null) {
      throw new Error("Vacancy Understanding not found");
    }
    const fallback = buildFallbackDraft(detail, profileData);
    let snapshot = fallback;
    try {
      snapshot = await buildAiDraft(detail, profileData, fallback);
    } catch (error) {
      console.warn("AI CV Draft generation failed", error);
      throw new Error(`AI CV Draft generation failed. ${aiDraftErrorMessage(error)}`);
    }
    return await ctx.runMutation(internal.applicationPackage.upsertGeneratedCvDraft, {
      ownerToken,
      vacancyUnderstandingId: args.vacancyUnderstandingId,
      snapshot,
      overwrite: false,
    });
  },
});

export const regenerateCvDraft = action({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: v.id("cvDrafts"),
  handler: async (ctx, args): Promise<Id<"cvDrafts">> => {
    const ownerToken = await requireOwnerToken(ctx);
    const detail: VacancyDetail = await ctx.runQuery(internal.vacancy.getForAnalysis, {
      vacancyUnderstandingId: args.vacancyUnderstandingId,
      ownerToken,
    });
    const profileData: CandidateProfileData = await ctx.runQuery(internal.profile.getForAnalysis, {
      ownerToken,
    });
    if (detail === null || profileData === null) {
      throw new Error("Vacancy Understanding not found");
    }
    const fallback = buildFallbackDraft(detail, profileData);
    let snapshot = fallback;
    try {
      snapshot = await buildAiDraft(detail, profileData, fallback);
    } catch (error) {
      console.warn("AI CV Draft regeneration failed", error);
      throw new Error(`AI CV Draft regeneration failed. ${aiDraftErrorMessage(error)}`);
    }
    return await ctx.runMutation(internal.applicationPackage.upsertGeneratedCvDraft, {
      ownerToken,
      vacancyUnderstandingId: args.vacancyUnderstandingId,
      snapshot,
      overwrite: true,
    });
  },
});

export const generateCvPdfVersion = action({
  args: { cvDraftId: v.id("cvDrafts") },
  returns: v.id("cvPdfVersions"),
  handler: async (ctx, args): Promise<Id<"cvPdfVersions">> => {
    const ownerToken = await requireOwnerToken(ctx);
    const draft = await ctx.runQuery(api.applicationPackage.getCvDraftForPdf, {
      cvDraftId: args.cvDraftId,
    });
    if (draft === null) {
      throw new Error("CV Draft not found");
    }
    const buffer = await renderCvPdf(draft.snapshot);
    const storageId = await ctx.storage.store(
      new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    );
    const filename = pdfFilename(draft.snapshot);
    return await ctx.runMutation(internal.applicationPackage.createPdfVersion, {
      ownerToken,
      cvDraftId: draft._id,
      storageId,
      filename,
    });
  },
});

function pdfFilename(snapshot: CvDraftSnapshot) {
  const slug = `${snapshot.name}-${snapshot.company}-${snapshot.role}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${slug || "cv"}.pdf`;
}

function safePdfColor(value: string) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : "#2563eb";
}

async function renderCvPdf(snapshot: CvDraftSnapshot) {
  const chunks: Buffer[] = [];
  const accent = safePdfColor(snapshot.accent);
  const doc = new PDFDocument({
    margin: 56,
    size: snapshot.paper === "letter" ? "LETTER" : "A4",
  });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fillColor(accent).fontSize(22).text(snapshot.name);
  doc.fillColor("#111827").fontSize(12).text(`${snapshot.role} · ${snapshot.company}`);
  const contact = [snapshot.email, snapshot.location, ...snapshot.links]
    .filter(Boolean)
    .join(" · ");
  if (contact !== "") {
    doc.fillColor("#4b5563").fontSize(9).text(contact);
  }

  doc.moveDown();
  doc.fillColor("#111827").fontSize(11).text(snapshot.summary, { lineGap: 3 });

  const skills = topSkills(snapshot.skills);
  if (skills.length > 0) {
    sectionTitle(doc, "Skills", accent);
    doc.fillColor("#111827").fontSize(10).text(skills.join(" • "), { lineGap: 2 });
  }

  if (snapshot.experience.length > 0) {
    sectionTitle(doc, "Experience", accent);
    for (const experience of snapshot.experience) {
      doc
        .fillColor("#111827")
        .fontSize(11)
        .text(
          `${experience.role} @ ${experience.company}${experience.period ? ` (${experience.period})` : ""}`,
        );
      const story = experience.bullets.map(clean).filter(Boolean).join(" ");
      if (story !== "") {
        doc.fillColor("#374151").fontSize(9).text(story, { lineGap: 2 });
      }
      doc.moveDown(0.5);
    }
  }

  if (snapshot.education.length > 0) {
    sectionTitle(doc, "Education", accent);
    for (const education of snapshot.education) {
      doc
        .fillColor("#111827")
        .fontSize(11)
        .text(
          `${education.degree} - ${education.school}${education.period ? ` (${education.period})` : ""}`,
        );
      for (const detail of education.details) {
        doc.fillColor("#374151").fontSize(9).text(`• ${detail}`, { indent: 8, lineGap: 2 });
      }
      doc.moveDown(0.5);
    }
  }

  doc.end();
  return await done;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, accent: string) {
  doc.moveDown();
  doc.fillColor(accent).fontSize(13).text(title);
  doc.moveDown(0.25);
}
