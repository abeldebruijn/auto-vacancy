"use node";

import { generateText, Output } from "ai";
import { z } from "zod";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const requiredSkillSchema = z.object({
  kind: z.enum(["soft", "hard"]),
  name: z.string(),
  evidence: z.string().nullable(),
});

const vacancyAnalysisSchema = z.object({
  companyName: z.string().nullable(),
  companyHomepageUrl: z.string().nullable(),
  companyConfidence: z.number().min(0).max(1),
  title: z.string().nullable(),
  titleConfidence: z.number().min(0).max(1),
  language: z.string().nullable(),
  languageConfidence: z.number().min(0).max(1),
  coverLetterAddressee: z.string().nullable(),
  requiredSkills: z.array(requiredSkillSchema),
  questions: z.array(
    z.object({
      prompt: z.string(),
      shortPrompt: z.string(),
      reason: z.string(),
      required: z.boolean(),
    }),
  ),
});

const researchSummarySchema = z.object({
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

type CandidateProfileData = typeof api.profile.get._returnType;
type VacancyDetail = typeof api.vacancy.get._returnType;

function modelId() {
  return process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.1-mini";
}

function normalizeUrl(url: string | null) {
  if (url === null) return null;
  const trimmed = url.trim();
  if (trimmed === "") return null;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function pageUrl(homepageUrl: string, path: string) {
  try {
    return new URL(path, homepageUrl).toString();
  } catch {
    return homepageUrl;
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

async function fetchText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Auto Vacancy research bot; summarizes public company pages for job seekers",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/json")) {
      return null;
    }
    return stripHtml(await response.text());
  } catch {
    return null;
  }
}

async function fetchWikipedia(companyName: string) {
  try {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "opensearch");
    searchUrl.searchParams.set("search", companyName);
    searchUrl.searchParams.set("limit", "1");
    searchUrl.searchParams.set("namespace", "0");
    searchUrl.searchParams.set("format", "json");
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;
    const data = (await searchResponse.json()) as [string, string[], string[], string[]];
    const title = data[1]?.[0];
    const url = data[3]?.[0];
    if (!title || !url) return null;
    const summaryResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    if (!summaryResponse.ok) return null;
    const summary = (await summaryResponse.json()) as { extract?: string };
    return {
      url,
      title,
      text: summary.extract ?? "",
    };
  } catch {
    return null;
  }
}

async function summarizeSource(args: {
  sourceType: "homepage" | "about" | "team" | "wikipedia" | "fallback";
  sourceTitle: string;
  sourceUrl: string;
  companyName: string;
  text: string;
}) {
  if (args.text.trim().length < 120) return null;
  const { output } = await generateText({
    model: modelId(),
    maxRetries: 1,
    timeout: { totalMs: 45000 },
    output: Output.object({
      schema: researchSummarySchema,
      name: "company_research_summary",
      description: "Two to three paragraph summary of one company information source.",
    }),
    system:
      "Summarize the source for a Job Seeker tailoring a CV and Cover Letter. Focus on mission and positioning, what the company does or makes, clients or audience, and why the Vacancy may matter. Write two to three concise paragraphs. Do not invent unsupported facts.",
    prompt: `Company: ${args.companyName}\nSource type: ${args.sourceType}\nSource URL: ${args.sourceUrl}\n\nSource text:\n${args.text}`,
  });
  return {
    sourceType: args.sourceType,
    sourceTitle: args.sourceTitle,
    sourceUrl: args.sourceUrl,
    summary: output.summary,
    confidence: output.confidence,
  };
}

function normalizeSkillName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function skillMatches(required: string, candidate: string) {
  const left = normalizeSkillName(required);
  const right = normalizeSkillName(candidate);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function matchSkills(
  requiredSkills: z.infer<typeof requiredSkillSchema>[],
  profileData: NonNullable<CandidateProfileData>,
) {
  return requiredSkills.map((skill) => {
    const matchedCandidateSkills = profileData.skills.filter((candidateSkill) =>
      skillMatches(skill.name, candidateSkill.name),
    );
    return {
      ...skill,
      matchStatus: matchedCandidateSkills.length > 0 ? ("matched" as const) : ("missing" as const),
      matchedCandidateSkillIds: matchedCandidateSkills.map((candidateSkill) => candidateSkill._id),
    };
  });
}

function missingSkillQuestions(
  skills: ReturnType<typeof matchSkills>,
): z.infer<typeof vacancyAnalysisSchema>["questions"] {
  return skills
    .filter((skill) => skill.matchStatus === "missing")
    .slice(0, 6)
    .map((skill) => ({
      prompt: `The Vacancy asks for ${skill.name}. Do you have experience with this? If yes, describe the experience that proves it. If no, say no.`,
      shortPrompt: skill.name,
      reason: `Required ${skill.kind} skill not found in the Candidate Profile.`,
      required: true,
    }));
}

async function buildResearchSummaries(companyName: string, homepageUrl: string | null) {
  const sources: Array<{
    sourceType: "homepage" | "about" | "team" | "wikipedia" | "fallback";
    sourceTitle: string;
    sourceUrl: string;
    text: string;
  }> = [];

  if (homepageUrl !== null) {
    const pages = [
      { sourceType: "homepage" as const, sourceTitle: "Company homepage", url: homepageUrl },
      {
        sourceType: "about" as const,
        sourceTitle: "Company about page",
        url: pageUrl(homepageUrl, "/about"),
      },
      {
        sourceType: "team" as const,
        sourceTitle: "Company team page",
        url: pageUrl(homepageUrl, "/team"),
      },
    ];
    const fetched = await Promise.all(
      pages.map(async (page) => ({
        ...page,
        text: await fetchText(page.url),
      })),
    );
    for (const page of fetched) {
      if (page.text !== null) {
        sources.push({
          sourceType: page.sourceType,
          sourceTitle: page.sourceTitle,
          sourceUrl: page.url,
          text: page.text,
        });
      }
    }
  }

  const wikipedia = await fetchWikipedia(companyName);
  if (wikipedia !== null && wikipedia.text.trim() !== "") {
    sources.push({
      sourceType: "wikipedia",
      sourceTitle: wikipedia.title,
      sourceUrl: wikipedia.url,
      text: wikipedia.text,
    });
  }

  const uniqueSources = sources.filter(
    (source, index) => sources.findIndex((item) => item.sourceUrl === source.sourceUrl) === index,
  );
  const summaries = await Promise.all(
    uniqueSources.map((source) =>
      summarizeSource({
        ...source,
        companyName,
      }),
    ),
  );
  return summaries.filter((summary): summary is NonNullable<typeof summary> => summary !== null);
}

function companyNeedsHomepage(analysis: z.infer<typeof vacancyAnalysisSchema>) {
  return analysis.companyName === null || analysis.companyConfidence < 0.62;
}

function detectLanguage(text: string) {
  const dutchHits = [" en ", " de ", " het ", " wij ", " jij ", " functie ", " ervaring "].filter(
    (word) => text.toLowerCase().includes(word),
  ).length;
  const englishHits = [" and ", " the ", " we ", " you ", " role ", " experience "].filter((word) =>
    text.toLowerCase().includes(word),
  ).length;
  if (dutchHits > englishHits) return "Dutch";
  if (englishHits > 0) return "English";
  return null;
}

function fallbackTitle(text: string) {
  const titlePatterns = [
    /(?:vacancy|role|position|functie)\s*:?\s*([^\n.]{3,80})/i,
    /(?:hiring|zoeken|gezocht)\s+(?:a|an|een)?\s*([^\n.]{3,80})/i,
  ];
  for (const pattern of titlePatterns) {
    const match = text.match(pattern)?.[1]?.trim();
    if (match) return match.replace(/\s+/g, " ");
  }
  return null;
}

function timeoutFallback(args: {
  vacancyText: string;
  existingHomepageUrl: string | null;
  errorMessage: string;
}) {
  const language = detectLanguage(args.vacancyText);
  const title = fallbackTitle(args.vacancyText);
  const needsHomepage = args.existingHomepageUrl === null;
  return {
    companyName: null,
    companyHomepageUrl: args.existingHomepageUrl,
    companyConfidence: 0,
    title,
    titleConfidence: title === null ? 0 : 0.45,
    language,
    languageConfidence: language === null ? 0 : 0.55,
    coverLetterAddressee: null,
    status: needsHomepage ? ("needs_homepage" as const) : ("asking_questions" as const),
    error: `AI analysis timed out. Continue manually; the system can retry after the homepage is provided. ${args.errorMessage}`,
    researchSummaries: [],
    requiredSkills: [],
    questions: needsHomepage
      ? []
      : [
          {
            prompt: "What company is this Vacancy for, and who should the Cover Letter address?",
            shortPrompt: "Company and addressee",
            reason: "AI analysis timed out before company details were extracted.",
            required: true,
          },
          {
            prompt: "What Vacancy title should Auto Vacancy use for the CV and Cover Letter?",
            shortPrompt: "Vacancy title",
            reason: "AI analysis timed out before the title was confidently extracted.",
            required: true,
          },
        ],
  };
}

export const analyze = action({
  args: { vacancyUnderstandingId: v.id("vacancyUnderstandings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const detail: VacancyDetail = await ctx.runQuery(api.vacancy.get, {
      vacancyUnderstandingId: args.vacancyUnderstandingId,
    });
    const profileData: CandidateProfileData = await ctx.runQuery(api.profile.get, {});
    if (detail === null || profileData === null) {
      throw new Error("Vacancy Understanding not found");
    }
    try {
      const candidateSummary = [
        `Skills: ${profileData.skills.map((skill) => `${skill.name} (${skill.kind})`).join(", ")}`,
        `Experiences: ${profileData.experiences.map((experience) => experience.employer).join(", ")}`,
        `Hobbies: ${profileData.hobbies.map((hobby) => hobby.title).join(", ")}`,
      ].join("\n");
      const { output } = await generateText({
        model: modelId(),
        maxRetries: 1,
        timeout: { totalMs: 90000 },
        output: Output.object({
          schema: vacancyAnalysisSchema,
          name: "vacancy_understanding",
          description: "Structured Vacancy facts, requirements, and relevant Job Seeker questions.",
        }),
        system:
          "Analyze a Vacancy for a Job Seeker preparing a tailored CV and Cover Letter. Extract only supported company, title, language, addressee, hard skills, soft skills, and relevant clarification questions. Assume output language is the Vacancy language. Ask about hobbies only if they could be relevant. Ask about title or language only when ambiguous. Do not ask broad generic questions.",
        prompt: `Candidate Profile summary:\n${candidateSummary}\n\nVacancy text:\n${detail.vacancy.vacancyText}`,
      });

      const homepageUrl =
        normalizeUrl(detail.vacancy.companyHomepageUrl) ?? normalizeUrl(output.companyHomepageUrl);
      const needsHomepage = companyNeedsHomepage(output) && homepageUrl === null;
      const matchedSkills = matchSkills(output.requiredSkills, profileData);
      const questions = [...output.questions, ...missingSkillQuestions(matchedSkills)].slice(0, 24);
      const companyName = output.companyName;
      const researchSummaries =
        companyName !== null && !needsHomepage
          ? await buildResearchSummaries(companyName, homepageUrl)
          : [];
      await ctx.runMutation(api.vacancy.finishAnalysis, {
        vacancyUnderstandingId: args.vacancyUnderstandingId,
        companyName,
        companyHomepageUrl: homepageUrl,
        companyConfidence: output.companyConfidence,
        title: output.title,
        titleConfidence: output.titleConfidence,
        language: output.language,
        languageConfidence: output.languageConfidence,
        coverLetterAddressee: output.coverLetterAddressee,
        status: needsHomepage
          ? "needs_homepage"
          : questions.some((question) => question.required)
            ? "asking_questions"
            : "asking_questions",
        error: null,
        researchSummaries,
        requiredSkills: matchedSkills,
        questions,
      });
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vacancy analysis failed";
      const readableError = message.includes("Configure AI_GATEWAY_API_KEY")
        ? "AI Gateway is not configured for Convex. Set AI_GATEWAY_API_KEY in Convex environment variables and try again."
        : message;
      const fallback = timeoutFallback({
        vacancyText: detail.vacancy.vacancyText,
        existingHomepageUrl: normalizeUrl(detail.vacancy.companyHomepageUrl),
        errorMessage: readableError,
      });
      await ctx.runMutation(api.vacancy.finishAnalysis, {
        vacancyUnderstandingId: args.vacancyUnderstandingId,
        companyName: fallback.companyName,
        companyHomepageUrl: fallback.companyHomepageUrl,
        companyConfidence: fallback.companyConfidence,
        title: fallback.title,
        titleConfidence: fallback.titleConfidence,
        language: fallback.language,
        languageConfidence: fallback.languageConfidence,
        coverLetterAddressee: fallback.coverLetterAddressee,
        status: fallback.status,
        error: fallback.error,
        researchSummaries: fallback.researchSummaries,
        requiredSkills: fallback.requiredSkills,
        questions: fallback.questions,
      });
      return null;
    }
  },
});
