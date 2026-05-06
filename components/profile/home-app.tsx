"use client";

import { useState } from "react";
import { Authenticated, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { isMarkdownCvFile } from "@/lib/candidate-profile";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SignInAction, SignUpAction } from "@/components/auth/auth-actions";
import { AppHeader } from "@/components/profile/app-header";
import { StartProfileScreen } from "@/components/profile/start-profile-screen";
import { statusLabel, vacancyReviewPath } from "@/components/vacancy/vacancy-utils";

export function HomeApp() {
  return (
    <div className="av-app-shell text-[#171827]">
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
  const [includeArchived, setIncludeArchived] = useState(false);
  const vacancies = useQuery(api.vacancy.list, { includeArchived });
  const importMarkdown = useAction(api.importedCv.importMarkdown);
  const createVacancy = useMutation(api.vacancy.create);
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [vacancyStatus, setVacancyStatus] = useState<string | null>(null);
  const [isConvertingVacancySource, setIsConvertingVacancySource] = useState(false);

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
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isMarkdownCvFile(file.name) && !isPdf) {
      setStatus("Upload a .md or PDF file.");
      return;
    }

    if (!isPdf) {
      await handleImportMarkdown(file.name, await file.text());
      return;
    }

    setStatus("Converting Imported CV...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/imported-cv/markdown", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        markdown?: string;
        error?: string;
      };

      if (!response.ok || typeof result.markdown !== "string") {
        throw new Error(result.error ?? "Could not convert Imported CV.");
      }

      await handleImportMarkdown("uploaded-cv.md", result.markdown);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not convert Imported CV.");
    }
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
      const vacancyUnderstandingId = await createVacancy({
        vacancyText: trimmed,
      });
      router.push(`/specify-vacancy/${vacancyUnderstandingId}`);
    } catch (error) {
      setVacancyStatus(error instanceof Error ? error.message : "Could not create Vacancy.");
    }
  }

  async function handleVacancySourceUpload(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setVacancyStatus("Upload a PDF Vacancy Source.");
      return;
    }

    if (
      vacancyText.trim() !== "" &&
      !window.confirm("Replace the current Vacancy description with text from this PDF?")
    ) {
      return;
    }

    setIsConvertingVacancySource(true);
    setVacancyStatus("Converting Vacancy Source...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/vacancy-source/markdown", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        markdown?: string;
        error?: string;
      };

      if (!response.ok || typeof result.markdown !== "string") {
        throw new Error(result.error ?? "Could not convert Vacancy Source.");
      }

      setVacancyText(result.markdown);
      setVacancyStatus("Vacancy Source converted. Review before continuing.");
    } catch (error) {
      setVacancyStatus(
        error instanceof Error ? error.message : "Could not convert Vacancy Source.",
      );
    } finally {
      setIsConvertingVacancySource(false);
    }
  }

  if (profileData === undefined) {
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
      <Card className="av-hover-lift w-full">
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
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isConvertingVacancySource}
                onClick={() => document.getElementById("vacancy-source-pdf")?.click()}
              >
                <Upload className="size-4" />
                Upload PDF
              </Button>
              <input
                id="vacancy-source-pdf"
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void handleVacancySourceUpload(file);
                }}
              />
              <p className="text-sm text-muted-foreground">
                Convert a PDF Vacancy Source to markdown before starting.
              </p>
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
      <VacancyTable
        vacancies={vacancies}
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
        onOpen={(path) => router.push(path)}
      />
    </main>
  );
}

function VacancyTable({
  vacancies,
  includeArchived,
  onIncludeArchivedChange,
  onOpen,
}: {
  vacancies: Doc<"vacancyUnderstandings">[] | undefined;
  includeArchived: boolean;
  onIncludeArchivedChange: (includeArchived: boolean) => void;
  onOpen: (path: string) => void;
}) {
  return (
    <Card className="w-full" variant="flat">
      <CardHeader>
        <CardTitle className="text-xl">Vacancy Understandings</CardTitle>
        <CardAction>
          <label className="flex items-center gap-2 pt-1 text-sm font-medium text-muted-foreground">
            <Checkbox
              checked={includeArchived}
              onCheckedChange={(checked) => onIncludeArchivedChange(checked === true)}
            />
            Show archived
          </label>
        </CardAction>
      </CardHeader>
      <CardContent>
        {vacancies === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : vacancies.length === 0 ? (
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
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        className="max-w-full truncate"
                        title={statusLabel(vacancy.status)}
                        variant={vacancy.status === "ready" ? "default" : "secondary"}
                      >
                        {statusLabel(vacancy.status)}
                      </Badge>
                      {vacancy.archivedAt !== undefined ? (
                        <Badge variant="outline">Archived</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(vacancy.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onOpen(
                          vacancy.status === "asking_questions"
                            ? `/specify-vacancy/${vacancy._id}`
                            : vacancyReviewPath(vacancy.slug, vacancy._id),
                        )
                      }
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
      <Card className="av-glass-strong w-full">
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
            <SignInAction className="w-full" />
            <SignUpAction className="w-full" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
