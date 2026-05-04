"use client";

import { useState } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { isMarkdownCvFile } from "@/lib/candidate-profile";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/profile/app-header";
import { StartProfileScreen } from "@/components/profile/start-profile-screen";
import { statusLabel, vacancyReviewPath } from "@/components/vacancy/vacancy-utils";

export function HomeApp() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <AppHeader />
      <Authenticated>
        <HomeWorkspace />
      </Authenticated>
      <Unauthenticated>
        <PublicHome />
      </Unauthenticated>
    </div>
  );
}

function HomeWorkspace() {
  const router = useRouter();
  const profileData = useQuery(api.profile.get);
  const vacancies = useQuery(api.vacancy.list);
  const importMarkdown = useAction(api.importedCv.importMarkdown);
  const createVacancy = useMutation(api.vacancy.create);
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [vacancyStatus, setVacancyStatus] = useState<string | null>(null);

  async function handleImportMarkdown(filename: string, markdown: string) {
    if (markdown.trim() === "") {
      setStatus("Add markdown content first.");
      return;
    }

    setStatus("Extracting Imported CV...");
    const result = await importMarkdown({ filename, markdown });

    if (result.status === "applied") {
      setStatus("Imported CV applied.");
      router.push("/profile");
      return;
    }

    setStatus(
      result.status === "preview"
        ? "Replacement preview ready."
        : (result.error ?? "Extraction failed."),
    );
  }

  async function handleImport(file: File) {
    if (!isMarkdownCvFile(file.name)) {
      setStatus("Upload a .md file.");
      return;
    }

    await handleImportMarkdown(file.name, await file.text());
  }

  async function handleVacancySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = vacancyText.trim();
    if (trimmed.length < 40) {
      setVacancyStatus("Paste a fuller Vacancy description first.");
      return;
    }
    setVacancyStatus("Creating Vacancy Understanding...");
    try {
      const vacancyUnderstandingId = await createVacancy({ vacancyText: trimmed });
      router.push(`/specify-vacancy/${vacancyUnderstandingId}`);
    } catch (error) {
      setVacancyStatus(error instanceof Error ? error.message : "Could not create Vacancy.");
    }
  }

  if (profileData === undefined || vacancies === undefined) {
    return (
      <main className="grid min-h-[70vh] place-items-center">
        <div className="w-full max-w-3xl space-y-4 px-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    );
  }

  if (profileData === null) {
    return (
      <StartProfileScreen
        pastedMarkdown={pastedMarkdown}
        status={status}
        onMarkdownChange={setPastedMarkdown}
        onPasteImport={() => void handleImportMarkdown("pasted-cv.md", pastedMarkdown)}
        onFileImport={(file) => void handleImport(file)}
        onManualStart={() => router.push("/profile")}
      />
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Add a Vacancy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="space-y-4" onSubmit={handleVacancySubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="vacancy-text">
                Vacancy description
              </label>
              <Textarea
                id="vacancy-text"
                value={vacancyText}
                onChange={(event) => setVacancyText(event.target.value)}
                className="max-h-[28rem] min-h-64 resize-y overflow-y-auto"
                placeholder="Paste the full Vacancy text here..."
              />
            </div>
            {vacancyStatus ? (
              <p className="text-sm text-muted-foreground">{vacancyStatus}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={vacancyText.trim().length < 40}>
                Start Vacancy Understanding
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/profile")}>
                Review Candidate Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <VacancyTable vacancies={vacancies} onOpen={(path) => router.push(path)} />
    </main>
  );
}

function VacancyTable({
  vacancies,
  onOpen,
}: {
  vacancies: Doc<"vacancyUnderstandings">[];
  onOpen: (path: string) => void;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Vacancy Understandings</CardTitle>
      </CardHeader>
      <CardContent>
        {vacancies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Vacancy Understandings yet.</p>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[38%] md:w-[39%]">Vacancy</TableHead>
                <TableHead className="w-[18%] md:w-[14%]">Company</TableHead>
                <TableHead className="w-[30%] md:w-[25%]">Status</TableHead>
                <TableHead className="hidden w-[13%] md:table-cell">Created</TableHead>
                <TableHead className="w-[14%] text-right md:w-[9%]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacancies.map((vacancy) => (
                <TableRow key={vacancy._id}>
                  <TableCell className="font-medium">
                    <span className="block truncate" title={vacancy.title ?? "Untitled Vacancy"}>
                      {vacancy.title ?? "Untitled Vacancy"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block truncate" title={vacancy.companyName ?? "Unknown"}>
                      {vacancy.companyName ?? "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    <Badge
                      className="max-w-full truncate"
                      title={statusLabel(vacancy.status)}
                      variant={vacancy.status === "ready" ? "default" : "secondary"}
                    >
                      {statusLabel(vacancy.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(vacancy.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpen(vacancyReviewPath(vacancy.slug, vacancy._id))}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function PublicHome() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-57px)] max-w-3xl place-items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            Auto Vacancy
          </div>
          <CardTitle className="text-2xl">Prepare vacancy-specific applications faster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Create a reusable Candidate Profile once, then use it to generate tailored CVs and Cover
            Letters for each Vacancy.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <SignInButton mode="modal">
              <Button className="w-full">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="w-full" variant="outline">
                Create account
              </Button>
            </SignUpButton>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
