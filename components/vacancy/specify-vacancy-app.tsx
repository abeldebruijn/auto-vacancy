"use client";

import { animated, useSpring } from "@react-spring/web";
import {
  forceCollide,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Force,
  type SimulationNodeDatum,
} from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SignInAction } from "@/components/auth/auth-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { vacancyReviewPath } from "@/components/vacancy/vacancy-utils";

type SpecifyDetail = NonNullable<typeof api.vacancy.get._returnType>;
type AnsweredQuestion = SpecifyDetail["questions"][number] & { answer: string };
type Position = {
  x: number;
  y: number;
};
type FieldSize = {
  width: number;
  height: number;
};
type SimNode = SimulationNodeDatum & {
  id: string;
  cardWidth: number;
  cardHeight: number;
  radius: number;
};

export function SpecifyVacancyApp({
  vacancyUnderstandingId,
}: {
  vacancyUnderstandingId: Id<"vacancyUnderstandings">;
}) {
  return (
    <div className="av-app-shell text-[#171827]">
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
              <SignInAction />
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
  const clearQuestionAnswer = useMutation(api.vacancy.clearQuestionAnswer);
  const understandsVacancy = useMutation(api.vacancy.understandsVacancy);
  const startAnalysis = useMutation(api.vacancy.startAnalysis);
  const analysisStartedRef = useRef(false);
  const [homepageUrl, setHomepageUrl] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isRetryingAnalysis, setIsRetryingAnalysis] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exitingQuestion, setExitingQuestion] = useState<SpecifyDetail["questions"][number] | null>(
    null,
  );

  const pendingQuestions = useMemo(() => {
    return detail?.questions.filter((question) => question.answer === null) ?? [];
  }, [detail?.questions]);
  const answeredQuestions = useMemo(() => {
    return (
      detail?.questions.filter(
        (question): question is AnsweredQuestion => question.answer !== null,
      ) ?? []
    );
  }, [detail?.questions]);
  const safeActiveIndex =
    pendingQuestions.length === 0
      ? 0
      : Math.min(activeIndex, Math.max(0, pendingQuestions.length - 1));
  const activeQuestion = pendingQuestions[safeActiveIndex] ?? null;
  const requiredQuestionsRemaining = pendingQuestions.filter(
    (question) => question.required,
  ).length;
  const isComposerVisible = activeQuestion !== null || exitingQuestion !== null;

  useEffect(() => {
    if (detail?.vacancy.status !== "processing" || analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    void startAnalysis({ vacancyUnderstandingId: detail.vacancy._id });
  }, [detail?.vacancy._id, detail?.vacancy.status, startAnalysis]);

  useEffect(() => {
    if (!exitingQuestion) return;
    const timeout = window.setTimeout(() => setExitingQuestion(null), 520);
    return () => window.clearTimeout(timeout);
  }, [exitingQuestion]);

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
      await provideHomepage({
        vacancyUnderstandingId: detail.vacancy._id,
        homepageUrl,
      });
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

  async function recallAnswer(question: AnsweredQuestion) {
    if (!detail) return;
    setMessage("Moving question back to the stack...");
    try {
      await clearQuestionAnswer({ questionId: question._id });
      setAnswerDrafts((drafts) => ({
        ...drafts,
        [question._id]: question.answer,
      }));
      const nextPendingQuestions = detail.questions.filter(
        (candidate) => candidate.answer === null || candidate._id === question._id,
      );
      const nextIndex = nextPendingQuestions.findIndex(
        (candidate) => candidate._id === question._id,
      );
      setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not move question back.");
    }
  }

  async function finish() {
    if (!detail) return;
    setMessage("Marking Vacancy Understanding ready...");
    try {
      const path = await understandsVacancy({
        vacancyUnderstandingId: detail.vacancy._id,
      });
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

  return (
    <main className="relative min-h-svh overflow-hidden">
      <AnswerField
        answers={answeredQuestions}
        onRecall={(question) => void recallAnswer(question)}
      />

      <div className="absolute left-3 top-3 z-30 flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-2 sm:left-6 sm:top-6">
        <Button type="button" onClick={() => router.push("/")} className="w-full justify-start">
          <ArrowLeft className="size-3.5" />
          Back home
        </Button>
        <CompanyResearchPanel
          detail={detail}
          isRetrying={isRetryingAnalysis}
          onRetry={() => void retryAnalysis()}
        />
        <DetectedDetailsPanel detail={detail} />
      </div>

      <section className="absolute inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-8 sm:pb-8">
        <div className="relative mx-auto max-w-5xl">
          <WorkflowUtilityPanel
            detail={detail}
            message={message}
            homepageUrl={homepageUrl}
            isRetryingAnalysis={isRetryingAnalysis}
            onHomepageChange={setHomepageUrl}
            onHomepageSubmit={submitHomepage}
            onRetry={() => void retryAnalysis()}
            onFinish={() => void finish()}
            onOpenDetails={() =>
              router.push(vacancyReviewPath(detail.vacancy.slug, detail.vacancy._id))
            }
            requiredQuestionsRemaining={requiredQuestionsRemaining}
            docked
          />
          {isComposerVisible ? (
            <>
              <QuestionStack count={pendingQuestions.length} />
              {exitingQuestion ? <ExitingComposer question={exitingQuestion} /> : null}
              {activeQuestion ? (
                <QuestionComposer
                  question={activeQuestion}
                  draft={answerDrafts[activeQuestion._id] ?? ""}
                  count={pendingQuestions.length}
                  activeIndex={safeActiveIndex}
                  onDraftChange={(value) =>
                    setAnswerDrafts((drafts) => ({
                      ...drafts,
                      [activeQuestion._id]: value,
                    }))
                  }
                  onMove={(direction) => {
                    setExitingQuestion(activeQuestion);
                    setActiveIndex((index) => {
                      if (pendingQuestions.length <= 1) return 0;
                      return (
                        (index + direction + pendingQuestions.length) % pendingQuestions.length
                      );
                    });
                  }}
                  onSubmit={() => {
                    setExitingQuestion(activeQuestion);
                    window.setTimeout(() => {
                      void submitAnswer(activeQuestion._id);
                    }, 500);
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function CompanyResearchPanel({
  detail,
  isRetrying,
  onRetry,
}: {
  detail: SpecifyDetail;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
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
  const snapshot = JSON.stringify({
    companyName: detail.vacancy.companyName,
    companyHomepageUrl: detail.vacancy.companyHomepageUrl,
    summariesCount,
    status: detail.vacancy.status,
    error: detail.vacancy.error,
  });
  const shouldFlash = usePanelFlash(snapshot);

  return (
    <section className="w-72 max-w-[calc(100vw-1.5rem)]">
      <button
        type="button"
        className={`av-control flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium ${
          shouldFlash ? "av-panel-flash" : ""
        }`}
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
      >
        <span>Company research</span>
        <span className="flex items-center gap-2">
          <Badge variant={completed === steps.length ? "default" : "secondary"}>
            {completed}/{steps.length}
          </Badge>
          <ChevronDown
            className={`size-4 text-[#777d96] transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {isOpen ? (
        <div className="av-glass mt-2 space-y-4 rounded-md p-4 text-sm">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-[#5657e8] transition-all"
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
        </div>
      ) : null}
    </section>
  );
}

function DetectedDetailsPanel({ detail }: { detail: SpecifyDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const snapshot = JSON.stringify({
    companyName: detail.vacancy.companyName,
    title: detail.vacancy.title,
    language: detail.vacancy.language,
    addressee: detail.vacancy.coverLetterAddressee,
    homepage: detail.vacancy.companyHomepageUrl,
  });
  const shouldFlash = usePanelFlash(snapshot);

  return (
    <section className="w-72 max-w-[calc(100vw-1.5rem)]">
      <button
        type="button"
        className={`av-control flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium ${
          shouldFlash ? "av-panel-flash" : ""
        }`}
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
      >
        <span>Detected details</span>
        <ChevronDown
          className={`size-4 text-[#777d96] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div className="av-glass mt-2 space-y-3 rounded-md p-4 text-sm">
          <DetailRow label="Company" value={detail.vacancy.companyName} />
          <DetailRow label="Title" value={detail.vacancy.title} />
          <DetailRow label="Language" value={detail.vacancy.language} />
          <DetailRow label="Addressee" value={detail.vacancy.coverLetterAddressee} />
          {detail.vacancy.companyHomepageUrl ? (
            <a
              className="inline-flex items-center gap-1 text-sm text-[#4f55e7] hover:underline"
              href={detail.vacancy.companyHomepageUrl}
              target="_blank"
              rel="noreferrer"
            >
              Company homepage
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function QuestionComposer({
  question,
  draft,
  count,
  activeIndex,
  onDraftChange,
  onMove,
  onSubmit,
}: {
  question: {
    _id: Id<"vacancyQuestions">;
    prompt: string;
    shortPrompt: string;
    reason: string;
  };
  draft: string;
  count: number;
  activeIndex: number;
  onDraftChange: (value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="av-glass-strong relative rounded-md p-3.5 transition-[transform,opacity] duration-500 sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2.5 sm:mb-6 sm:gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Question {activeIndex + 1} of {count}
          </p>
          <h1 className="mt-2 max-w-3xl text-xl font-semibold leading-snug">{question.prompt}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{question.reason}</p>
        </div>
        <div className="flex shrink-0 flex-col rounded-md border border-[#dfe4f3] bg-[#f7f9ff] p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous question"
            onClick={() => onMove(-1)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next question"
            onClick={() => onMove(1)}
          >
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex gap-2 items-end">
        <Textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
              return;
            }
            event.preventDefault();
            if (draft.trim() !== "") {
              onSubmit();
            }
          }}
          placeholder="Type your answer..."
          className="min-h-12 resize-none max-h-80"
        />
        <Button
          type="submit"
          className="size-12"
          aria-label="Submit answer"
          disabled={draft.trim() === ""}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function WorkflowUtilityPanel({
  detail,
  message,
  homepageUrl,
  isRetryingAnalysis,
  onHomepageChange,
  onHomepageSubmit,
  onRetry,
  onFinish,
  onOpenDetails,
  requiredQuestionsRemaining,
  docked = false,
}: {
  detail: SpecifyDetail;
  message: string | null;
  homepageUrl: string;
  isRetryingAnalysis: boolean;
  onHomepageChange: (value: string) => void;
  onHomepageSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  onFinish: () => void;
  onOpenDetails: () => void;
  requiredQuestionsRemaining: number;
  docked?: boolean;
}) {
  const hasUtility =
    message !== null ||
    detail.vacancy.status === "processing" ||
    detail.vacancy.status === "failed" ||
    detail.vacancy.status === "needs_homepage" ||
    detail.vacancy.status === "ready" ||
    detail.vacancy.status === "asking_questions";

  if (!hasUtility) return null;

  return (
    <section
      className={
        docked
          ? "relative z-20 mb-3 mx-auto max-w-xl sm:w-120"
          : "absolute left-3 right-3 top-28 z-20 mx-auto max-w-xl sm:left-auto sm:right-6 sm:top-20 sm:mx-0 sm:w-120"
      }
    >
      <div className="av-glass space-y-3 p-3 rounded-md text-sm">
        {detail.vacancy.status === "processing" ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="size-4 animate-pulse text-[#5657e8]" />
            Analyzing Vacancy text and researching company context.
          </p>
        ) : null}
        {detail.vacancy.status === "failed" ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Auto Vacancy could not complete the analysis. Retry the analysis or provide the
              company homepage when asked.
            </p>
            <Button type="button" onClick={onRetry} disabled={isRetryingAnalysis}>
              <RefreshCw className={isRetryingAnalysis ? "size-4 animate-spin" : "size-4"} />
              Try again
            </Button>
          </div>
        ) : null}
        {detail.vacancy.status === "needs_homepage" ? (
          <form className="flex gap-2" onSubmit={onHomepageSubmit}>
            <Input
              value={homepageUrl}
              onChange={(event) => onHomepageChange(event.target.value)}
              placeholder="https://company.com"
            />
            <Button type="submit">Continue</Button>
          </form>
        ) : null}
        {detail.vacancy.status === "asking_questions" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              {requiredQuestionsRemaining === 0
                ? "The agent understands the intent of the vacancy."
                : `Some question${requiredQuestionsRemaining === 1 ? "" : "s"} still need${requiredQuestionsRemaining === 1 ? "s" : ""} an answer before creating a CV and cover letter.`}
            </p>
            {requiredQuestionsRemaining === 0 ? (
              <Button type="button" onClick={onFinish}>
                Create CV and cover letter
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>
        ) : null}
        {detail.vacancy.status === "ready" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground">
              The agent understands the intent of the vacancy.
            </p>
            <Button type="button" onClick={onOpenDetails}>
              View Vacancy details
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}
        {message ? <p className="text-muted-foreground">{message}</p> : null}
      </div>
    </section>
  );
}

function QuestionStack({ count }: { count: number }) {
  const stackCount = Math.min(2, Math.max(0, count - 1));
  const visibleCards = Array.from({ length: stackCount }, (_, index) => index);

  return (
    <div className="pointer-events-none relative z-0">
      {visibleCards.map((index) => {
        const depth = stackCount - index;
        const width = Math.max(72, 100 - depth * 4);
        return (
          <div
            key={`${stackCount}-${index}`}
            className="mx-auto h-7 rounded-md border border-[#dfe4f3] bg-white/72 shadow-[0_12px_38px_rgba(91,94,170,0.09)] transition-all duration-500"
            style={{
              marginBottom: "-17px",
              opacity: 0.38 + index * 0.08,
              transform: `translateY(${Math.max(0, depth - 1) * 2}px)`,
              width: `${width}%`,
              zIndex: index,
            }}
          />
        );
      })}
    </div>
  );
}

function ExitingComposer({ question }: { question: SpecifyDetail["questions"][number] }) {
  return (
    <div className="composer-exit av-glass-strong pointer-events-none absolute inset-x-0 bottom-0 z-30 rounded-md p-3.5 sm:p-7">
      <div className="mb-3 flex items-start justify-between gap-2.5 sm:mb-6 sm:gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Question</p>
          <h1 className="mt-2 max-w-3xl text-xl font-semibold leading-snug">{question.prompt}</h1>
        </div>
        <div className="h-[72px] w-[42px] shrink-0 rounded-md border border-[#dfe4f3] bg-[#f7f9ff] sm:h-[82px] sm:w-[46px]" />
      </div>
      <div className="flex gap-2">
        <div className="min-h-12 flex-1 rounded-md border border-[#dfe4f3] bg-white/80" />
        <div className="w-10 rounded-md bg-[#5657e8]" />
      </div>
    </div>
  );
}

function AnswerField({
  answers,
  onRecall,
}: {
  answers: AnsweredQuestion[];
  onRecall: (item: AnsweredQuestion) => void;
}) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 720 });
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const positionsRef = useRef<Record<string, Position>>({});
  const [zoom, setZoom] = useState(1);
  const sceneScale = size.width < 480 ? 0.82 : size.width < 640 ? 0.9 : 1;

  function updateZoom(delta: number) {
    setZoom((value) => clamp(Number((value + delta).toFixed(2)), 0.6, 1.6));
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    updateZoom(event.deltaY > 0 ? -0.08 : 0.08);
  }

  useEffect(() => {
    const element = fieldRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (answers.length === 0) {
      setPositions((current) => {
        if (Object.keys(current).length === 0) return current;
        positionsRef.current = {};
        return {};
      });
      return;
    }

    const nodes: SimNode[] = answers.map((answer, index) => {
      const existing = positionsRef.current[answer._id];
      const cardWidth = estimateCardWidth(answer, size.width);
      const cardHeight = estimateCardHeight(answer, size.width);
      return {
        id: answer._id,
        cardWidth,
        cardHeight,
        radius: Math.hypot(cardWidth, cardHeight) / 2 - 6,
        x: existing?.x ?? size.width / 2 + (index % 2 === 0 ? -60 : 60),
        y: existing?.y ?? size.height - 210,
      };
    });

    const simulation = forceSimulation(nodes)
      .force("charge", forceManyBody<SimNode>().strength(-80))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((node) => node.radius)
          .iterations(4),
      )
      .force("x", forceX<SimNode>((_, index) => cloudX(index, size.width)).strength(0.045))
      .force("y", forceY<SimNode>((_, index) => cloudY(index, size.height)).strength(0.06))
      .force("edges", edgeForce(size, zoom * sceneScale))
      .alpha(0.9)
      .alphaDecay(0.035)
      .on("tick", () => {
        const nextPositions = Object.fromEntries(
          nodes.map((node) => {
            const edge = getNodeBounds(node, size, zoom * sceneScale);
            const topPadding = size.width < 640 ? 154 : 84;
            const bottomPadding = size.width < 640 ? 360 : 300;
            const minY = Math.max(edge.minY, topPadding);
            const maxY = Math.max(
              minY,
              Math.min(edge.maxY, Math.max(topPadding, size.height - bottomPadding)),
            );
            const x = clamp(Number(node.x), edge.minX, edge.maxX);
            const y = clamp(Number(node.y), minY, maxY);
            node.x = x;
            node.y = y;
            return [node.id, { x, y }];
          }),
        );
        positionsRef.current = nextPositions;
        setPositions(nextPositions);
      });

    return () => {
      simulation.stop();
    };
  }, [answers, sceneScale, size.height, size.width, zoom]);

  return (
    <div ref={fieldRef} className="absolute inset-0 z-10" onWheel={handleWheel}>
      <div className="absolute right-3 top-3 sm:right-6 sm:top-6 z-30 flex items-center gap-0.5 rounded-md border border-[#dfe4f3] bg-white/90 p-1 shadow-[0_10px_34px_rgba(92,99,180,0.08)] backdrop-blur sm:gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Zoom out answers"
          className="h-7 w-7 rounded-sm sm:h-8 sm:w-8"
          onClick={() => updateZoom(-0.1)}
          disabled={zoom <= 0.6}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-10 text-center text-xs font-medium tabular-nums text-[#777d96] sm:w-11">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reset answer zoom"
          className="h-7 w-7 rounded-sm sm:h-8 sm:w-8"
          onClick={() => setZoom(1)}
          disabled={zoom === 1}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Zoom in answers"
          className="h-7 w-7 rounded-sm sm:h-8 sm:w-8"
          onClick={() => updateZoom(0.1)}
          disabled={zoom >= 1.6}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div
        className="absolute inset-0 transition-transform duration-200"
        style={{
          transform: `scale(${zoom * sceneScale})`,
          transformOrigin: "center center",
        }}
      >
        {answers.map((answer) => (
          <FloatingAnswerCard
            key={answer._id}
            item={answer}
            position={
              positions[answer._id] ?? {
                x: size.width / 2,
                y: size.height - 220,
              }
            }
            onClick={() => onRecall(answer)}
          />
        ))}
      </div>
    </div>
  );
}

function FloatingAnswerCard({
  item,
  position,
  onClick,
}: {
  item: AnsweredQuestion;
  position: Position;
  onClick: () => void;
}) {
  const drift = getFloatingAnswerDrift(item._id);
  const driftStyle: Record<`--${string}`, string> = {
    "--floating-answer-drift-x": `${drift.x}px`,
    "--floating-answer-drift-y": `${drift.y}px`,
    "--floating-answer-drift-duration": `${drift.duration}s`,
    "--floating-answer-drift-delay": `${drift.delay}s`,
  };
  const spring = useSpring({
    from: {
      x: position.x,
      y: position.y + 90,
      opacity: 0,
      scale: 0.92,
    },
    to: {
      x: position.x,
      y: position.y,
      opacity: 1,
      scale: 1,
    },
    config: { tension: 230, friction: 20, mass: 0.8 },
  });

  return (
    <animated.button
      type="button"
      style={{
        left: spring.x,
        top: spring.y,
        opacity: spring.opacity,
        scale: spring.scale,
        ...driftStyle,
      }}
      onClick={onClick}
      className="floating-answer-card absolute min-w-36 max-w-[min(15rem,70vw)] -translate-x-1/2 -translate-y-1/2 text-left outline-none sm:max-w-[min(15rem,74vw)]"
    >
      <div className="floating-answer-drift block rounded-md border border-[#eef1fb] bg-white/88 px-4 py-3 shadow-[0_18px_54px_rgba(91,94,170,0.12)] backdrop-blur transition-shadow sm:px-5 sm:py-4">
        <span className="block text-sm font-medium text-[#171827] sm:text-sm">
          {item.shortPrompt}
        </span>
        <p className="mt-0 line-clamp-3 text-xs leading-snug text-[#777d96] sm:text-xs">
          {item.answer}
        </p>
      </div>
    </animated.button>
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

function usePanelFlash(snapshot: string) {
  const previousSnapshot = useRef(snapshot);
  const [shouldFlash, setShouldFlash] = useState(false);

  useEffect(() => {
    if (previousSnapshot.current === snapshot) return;
    previousSnapshot.current = snapshot;
    setShouldFlash(true);
    const timeout = window.setTimeout(() => setShouldFlash(false), 900);
    return () => window.clearTimeout(timeout);
  }, [snapshot]);

  return shouldFlash;
}

function getFloatingAnswerDrift(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  const angle = ((hash % 360) * Math.PI) / 180;
  const amplitude = 8 + (hash % 5);

  return {
    x: Number((Math.cos(angle) * amplitude).toFixed(2)),
    y: Number((Math.sin(angle) * amplitude).toFixed(2)),
    duration: 6.8 + (hash % 18) / 10,
    delay: -((hash % 50) / 10),
  };
}

function estimateCardWidth(item: AnsweredQuestion, viewportWidth: number) {
  const cssMaxWidth =
    viewportWidth < 640 ? Math.min(336, viewportWidth * 0.7) : Math.min(416, viewportWidth * 0.74);
  const textWidth = Math.max(item.shortPrompt.length * 7 + 64, item.answer.length * 8 + 96);
  return clamp(textWidth, 144, cssMaxWidth);
}

function estimateCardHeight(item: AnsweredQuestion, viewportWidth: number) {
  const cardWidth = estimateCardWidth(item, viewportWidth);
  const horizontalPadding = viewportWidth < 640 ? 32 : 40;
  const verticalPadding = viewportWidth < 640 ? 24 : 32;
  const answerLineLength = Math.max(9, Math.floor((cardWidth - horizontalPadding) / 9));
  const answerLines = Math.ceil(item.answer.length / answerLineLength);
  return verticalPadding + 18 + 8 + answerLines * 22;
}

function getNodeBounds(node: SimNode, size: FieldSize, scale: number) {
  const safeScale = Math.max(0.35, scale);
  const inset = size.width < 640 ? 22 : 28;
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const minX = centerX + (inset - centerX) / safeScale + node.cardWidth / 2;
  const maxX = centerX + (size.width - inset - centerX) / safeScale - node.cardWidth / 2;
  const minY = centerY + (inset - centerY) / safeScale + node.cardHeight / 2;
  const maxY = centerY + (size.height - inset - centerY) / safeScale - node.cardHeight / 2;

  if (minX > maxX || minY > maxY) {
    return {
      minX: Math.min(minX, centerX),
      maxX: Math.max(maxX, centerX),
      minY: Math.min(minY, centerY),
      maxY: Math.max(maxY, centerY),
    };
  }

  return { minX, maxX, minY, maxY };
}

function edgeForce(size: FieldSize, scale: number): Force<SimNode, undefined> {
  let nodes: SimNode[] = [];

  const force = ((alpha: number) => {
    for (const node of nodes) {
      const bounds = getNodeBounds(node, size, scale);
      const strength = 0.18 * alpha;
      if (Number(node.x) < bounds.minX) {
        node.vx = (node.vx ?? 0) + (bounds.minX - Number(node.x)) * strength;
      } else if (Number(node.x) > bounds.maxX) {
        node.vx = (node.vx ?? 0) - (Number(node.x) - bounds.maxX) * strength;
      }

      if (Number(node.y) < bounds.minY) {
        node.vy = (node.vy ?? 0) + (bounds.minY - Number(node.y)) * strength;
      } else if (Number(node.y) > bounds.maxY) {
        node.vy = (node.vy ?? 0) - (Number(node.y) - bounds.maxY) * strength;
      }
    }
  }) as Force<SimNode, undefined>;

  force.initialize = (nextNodes: SimNode[]) => {
    nodes = nextNodes;
  };

  return force;
}

function cloudX(index: number, width: number) {
  const slots =
    width < 640
      ? [0.36, 0.68, 0.5, 0.32, 0.7, 0.42, 0.62]
      : [0.18, 0.72, 0.5, 0.34, 0.84, 0.12, 0.62];
  return width * (slots[index % slots.length] ?? 0.5);
}

function cloudY(index: number, height: number) {
  const isMobileHeight = height < 820;
  const topOffset = isMobileHeight ? 150 : 76;
  const safeHeight = Math.max(220, height - (isMobileHeight ? 520 : 440));
  const rows = isMobileHeight
    ? [0.08, 0.42, 0.24, 0.58, 0.12, 0.5, 0.32]
    : [0.24, 0.38, 0.12, 0.55, 0.3, 0.48, 0.18];
  return topOffset + safeHeight * (rows[index % rows.length] ?? 0.35);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
