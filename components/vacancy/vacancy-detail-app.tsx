"use client";

import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { Archive, ArchiveRestore, ExternalLink } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/profile/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { statusLabel } from "@/components/vacancy/vacancy-utils";

export function VacancyDetailApp({ slugId }: { slugId: string }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <AppHeader logoHref="/" />
      <Authenticated>
        <VacancyDetailWorkspace slugId={slugId} />
      </Authenticated>
      <Unauthenticated>
        <main className="mx-auto grid min-h-[calc(100vh-57px)] max-w-xl place-items-center px-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign in to view this Vacancy</CardTitle>
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

function VacancyDetailWorkspace({ slugId }: { slugId: string }) {
  const detail = useQuery(api.vacancy.getBySlugId, { slugId });
  const setArchived = useMutation(api.vacancy.setArchived);

  if (detail === undefined) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
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
            <CardTitle>Vacancy not found</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Vacancy details</p>
          <h1 className="text-3xl font-semibold">
            {detail.vacancy.title ?? "Vacancy"} at {detail.vacancy.companyName ?? "Unknown company"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {detail.vacancy.archivedAt !== undefined ? (
            <Badge variant="outline">Archived</Badge>
          ) : null}
          <Badge variant={detail.vacancy.status === "ready" ? "default" : "secondary"}>
            {statusLabel(detail.vacancy.status)}
          </Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void setArchived({
                vacancyUnderstandingId: detail.vacancy._id,
                archived: detail.vacancy.archivedAt === undefined,
              })
            }
          >
            {detail.vacancy.archivedAt === undefined ? (
              <>
                <Archive className="size-4" />
                Archive
              </>
            ) : (
              <>
                <ArchiveRestore className="size-4" />
                Unarchive
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Company research</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.researchSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No company summaries available.</p>
              ) : (
                detail.researchSummaries.map((summary) => (
                  <article key={summary._id} className="space-y-2 border-b pb-4 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-medium">{summary.sourceTitle}</h2>
                      <Badge variant="outline">{summary.sourceType}</Badge>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {summary.summary}
                    </p>
                    <a
                      className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                      href={summary.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {summary.sourceUrl}
                      <ExternalLink className="size-3" />
                    </a>
                  </article>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Questions and answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions were needed.</p>
              ) : (
                detail.questions.map((question) => (
                  <div key={question._id} className="rounded-md border bg-white p-4">
                    <p className="font-medium">{question.prompt}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {question.answer ?? "No answer yet."}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Understood details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Company" value={detail.vacancy.companyName} />
              <Row label="Title" value={detail.vacancy.title} />
              <Row label="Language" value={detail.vacancy.language} />
              <Row label="Addressee" value={detail.vacancy.coverLetterAddressee} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.requiredSkills.map((skill) => (
                <div key={skill._id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{skill.name}</span>
                  <Badge
                    variant={
                      skill.matchStatus === "matched"
                        ? "default"
                        : skill.matchStatus === "missing"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {skill.matchStatus}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "Unknown"}</span>
    </div>
  );
}
