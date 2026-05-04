"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppHeader } from "@/components/profile/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { statusLabel, vacancyReviewPath } from "@/components/vacancy/vacancy-utils";

export function SpecifyVacancyApp({
  vacancyUnderstandingId,
}: {
  vacancyUnderstandingId: Id<"vacancyUnderstandings">;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <AppHeader logoHref="/" />
      <Authenticated>
        <SpecifyVacancyWorkspace vacancyUnderstandingId={vacancyUnderstandingId} />
      </Authenticated>
      <Unauthenticated>
        <main className="mx-auto grid min-h-[calc(100vh-57px)] max-w-xl place-items-center px-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign in to specify this Vacancy</CardTitle>
            </CardHeader>
            <CardContent>
              <SignInButton mode="modal">
                <Button>Sign in</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </main>
      </Unauthenticated>
    </div>
  );
}

function SpecifyVacancyWorkspace({
  vacancyUnderstandingId,
}: {
  vacancyUnderstandingId: Id<"vacancyUnderstandings">;
}) {
  const router = useRouter();
  const detail = useQuery(api.vacancy.get, { vacancyUnderstandingId });
  const provideHomepage = useMutation(api.vacancy.provideHomepage);
  const answerQuestion = useMutation(api.vacancy.answerQuestion);
  const understandsVacancy = useMutation(api.vacancy.understandsVacancy);
  const startAnalysis = useMutation(api.vacancy.startAnalysis);
  const analysisStartedRef = useRef(false);
  const [homepageUrl, setHomepageUrl] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isRetryingAnalysis, setIsRetryingAnalysis] = useState(false);

  const pendingQuestions = useMemo(() => {
    return detail?.questions.filter((question) => question.answer === null).slice(0, 3) ?? [];
  }, [detail?.questions]);

  useEffect(() => {
    if (detail?.vacancy.status !== "processing" || analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    void startAnalysis({ vacancyUnderstandingId: detail.vacancy._id });
  }, [detail?.vacancy._id, detail?.vacancy.status, startAnalysis]);

  if (detail === undefined) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (detail === null) {
    return (
      <main className="mx-auto grid min-h-[calc(100vh-57px)] max-w-xl place-items-center px-4">
        <Card>
          <CardHeader>
            <CardTitle>Vacancy Understanding not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>Back home</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  async function submitHomepage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setMessage("Researching company pages...");
    try {
      await provideHomepage({ vacancyUnderstandingId: detail.vacancy._id, homepageUrl });
      await startAnalysis({ vacancyUnderstandingId: detail.vacancy._id });
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save homepage.");
    }
  }

  async function submitAnswer(questionId: Id<"vacancyQuestions">) {
    const answer = answerDrafts[questionId]?.trim() ?? "";
    if (answer === "") return;
    setMessage("Saving answer...");
    try {
      await answerQuestion({ questionId, answer });
      setAnswerDrafts((drafts) => ({ ...drafts, [questionId]: "" }));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save answer.");
    }
  }

  async function finish() {
    if (!detail) return;
    setMessage("Marking Vacancy Understanding ready...");
    try {
      const path = await understandsVacancy({ vacancyUnderstandingId: detail.vacancy._id });
      router.push(path);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not finish yet.");
    }
  }

  async function retryAnalysis() {
    if (!detail || isRetryingAnalysis) return;
    setIsRetryingAnalysis(true);
    setMessage("Retrying company research...");
    try {
      await startAnalysis({ vacancyUnderstandingId: detail.vacancy._id });
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not retry company research.");
    } finally {
      setIsRetryingAnalysis(false);
    }
  }

  const answeredQuestions = detail.questions.filter((question) => question.answer !== null);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-6">
        <AnswersCard
          answeredQuestions={answeredQuestions}
          onAnswerSelect={(question) =>
            setAnswerDrafts((drafts) => ({
              ...drafts,
              [question._id]: question.answer ?? "",
            }))
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Vacancy Understanding</p>
            <h1 className="text-2xl font-semibold">
              {detail.vacancy.title ?? detail.vacancy.companyName ?? "Specify Vacancy"}
            </h1>
          </div>
          <Badge variant={detail.vacancy.status === "failed" ? "destructive" : "secondary"}>
            {statusLabel(detail.vacancy.status)}
          </Badge>
        </div>

        {detail.vacancy.status === "processing" ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse" />
              Analyzing Vacancy text and researching company context.
            </CardContent>
          </Card>
        ) : null}

        {detail.vacancy.status === "failed" ? (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle>Analysis failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Auto Vacancy could not complete the analysis. Retry the analysis or provide the
                company homepage when asked.
              </p>
              <Button onClick={() => void retryAnalysis()}>Try again</Button>
            </CardContent>
          </Card>
        ) : null}

        {detail.vacancy.status === "needs_homepage" ? (
          <Card>
            <CardHeader>
              <CardTitle>Company homepage needed</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex gap-2" onSubmit={submitHomepage}>
                <Input
                  value={homepageUrl}
                  onChange={(event) => setHomepageUrl(event.target.value)}
                  placeholder="https://company.com"
                />
                <Button type="submit">Continue</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {pendingQuestions.length > 0 ? (
          <QuestionBatch
            questions={pendingQuestions}
            answerDrafts={answerDrafts}
            onDraftChange={(questionId, value) =>
              setAnswerDrafts((drafts) => ({ ...drafts, [questionId]: value }))
            }
            onSubmit={(questionId) => void submitAnswer(questionId)}
          />
        ) : detail.vacancy.status === "asking_questions" ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                No blocking questions remain for this Vacancy Understanding.
              </p>
              <Button onClick={() => void finish()}>
                Understands Vacancy
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </section>

      <aside className="space-y-4">
        <CompanyResearchProgress
          detail={detail}
          isRetrying={isRetryingAnalysis}
          onRetry={() => void retryAnalysis()}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detected details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Company" value={detail.vacancy.companyName} />
            <DetailRow label="Title" value={detail.vacancy.title} />
            <DetailRow label="Language" value={detail.vacancy.language} />
            <DetailRow label="Addressee" value={detail.vacancy.coverLetterAddressee} />
            {detail.vacancy.companyHomepageUrl ? (
              <a
                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                href={detail.vacancy.companyHomepageUrl}
                target="_blank"
                rel="noreferrer"
              >
                Company homepage
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </CardContent>
        </Card>

        {detail.vacancy.status === "ready" ? (
          <Button
            className="w-full"
            onClick={() => router.push(vacancyReviewPath(detail.vacancy.slug, detail.vacancy._id))}
          >
            View Vacancy details
          </Button>
        ) : null}
      </aside>
    </main>
  );
}

function CompanyResearchProgress({
  detail,
  isRetrying,
  onRetry,
}: {
  detail: NonNullable<typeof api.vacancy.get._returnType>;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  const companyKnown = detail.vacancy.companyName !== null;
  const homepageKnown = detail.vacancy.companyHomepageUrl !== null;
  const summariesCount = detail.researchSummaries.length;
  const hasResearch = summariesCount > 0;
  const isProcessing = detail.vacancy.status === "processing";
  const needsHomepage = detail.vacancy.status === "needs_homepage";
  const steps = [
    {
      label: "Company",
      done: companyKnown,
      value: detail.vacancy.companyName ?? (isProcessing ? "Detecting" : "Unknown"),
    },
    {
      label: "Homepage",
      done: homepageKnown,
      value: detail.vacancy.companyHomepageUrl ?? (needsHomepage ? "Needed" : "Not found"),
    },
    {
      label: "Public sources",
      done: hasResearch,
      value: hasResearch ? `${summariesCount} summarized` : isProcessing ? "Checking" : "None yet",
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Company research</CardTitle>
          <Badge variant={completed === steps.length ? "default" : "secondary"}>
            {completed}/{steps.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-950 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex items-start gap-3">
              <span
                className={
                  step.done
                    ? "mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-neutral-950 text-white"
                    : "mt-0.5 inline-flex size-5 items-center justify-center rounded-full border bg-white text-muted-foreground"
                }
              >
                {step.done ? <Check className="size-3" /> : <Clock className="size-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{step.label}</span>
                <span className="block truncate text-muted-foreground" title={step.value}>
                  {step.value}
                </span>
              </span>
            </div>
          ))}
        </div>
        {detail.vacancy.error ? (
          <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">{detail.vacancy.error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-white"
              onClick={onRetry}
              disabled={isRetrying}
            >
              <RefreshCw className={isRetrying ? "size-4 animate-spin" : "size-4"} />
              {isRetrying ? "Retrying" : "Retry"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AnswersCard({
  answeredQuestions,
  onAnswerSelect,
}: {
  answeredQuestions: Array<{
    _id: Id<"vacancyQuestions">;
    shortPrompt: string;
    answer: string | null;
  }>;
  onAnswerSelect: (question: {
    _id: Id<"vacancyQuestions">;
    shortPrompt: string;
    answer: string | null;
  }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Answers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {answeredQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Answers will collect here.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {answeredQuestions.map((question) => (
              <button
                key={question._id}
                className="min-h-24 rounded-md border bg-white p-3 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                type="button"
                onClick={() => onAnswerSelect(question)}
              >
                <span className="font-medium">{question.shortPrompt}</span>
                <span className="mt-1 line-clamp-3 block text-muted-foreground">
                  {question.answer}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionBatch({
  questions,
  answerDrafts,
  onDraftChange,
  onSubmit,
}: {
  questions: Array<{
    _id: Id<"vacancyQuestions">;
    prompt: string;
    shortPrompt: string;
    reason: string;
  }>;
  answerDrafts: Record<string, string>;
  onDraftChange: (questionId: Id<"vacancyQuestions">, value: string) => void;
  onSubmit: (questionId: Id<"vacancyQuestions">) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeQuestion = questions[activeIndex] ?? questions[0];

  return (
    <Card>
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Question {activeIndex + 1} of {questions.length}
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-snug">{activeQuestion.prompt}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{activeQuestion.reason}</p>
          </div>
          <div className="flex shrink-0 flex-col rounded-md border bg-white p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous question"
              onClick={() =>
                setActiveIndex((index) => (index - 1 + questions.length) % questions.length)
              }
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next question"
              onClick={() => setActiveIndex((index) => (index + 1) % questions.length)}
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={answerDrafts[activeQuestion._id] ?? ""}
            onChange={(event) => onDraftChange(activeQuestion._id, event.target.value)}
            placeholder="Type your answer..."
            className="min-h-24"
          />
          <Button
            className="h-auto self-stretch"
            aria-label="Submit answer"
            onClick={() => onSubmit(activeQuestion._id)}
            disabled={(answerDrafts[activeQuestion._id] ?? "").trim() === ""}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "Unknown"}</span>
    </div>
  );
}
