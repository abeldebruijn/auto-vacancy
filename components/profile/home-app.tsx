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
            <div className="flex flex-wrap gap-2 justify-between">
              <Button type="button" variant="outline" onClick={() => router.push("/profile")}>
                Review Candidate Profile
              </Button>

              <Button type="submit" disabled={vacancyText.trim().length < 40}>
                Start Vacancy Understanding
                <ArrowRight className="size-4" />
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
    <main className="relative overflow-x-clip">
      {/* Hero */}
      <section className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 pb-16 pt-20 text-center">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(86,87,232,0.13) 0%, transparent 72%)",
          }}
        />

        <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe4f3] bg-white/80 px-4 py-1.5 text-xs font-medium text-[#5657e8] shadow-sm backdrop-blur">
          <span className="inline-block size-1.5 rounded-full bg-[#5657e8]" />
          AI-powered CV generation
        </div>

        <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight text-[#171827] sm:text-5xl">
          Turn any vacancy into a{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #5657e8 0%, #8e95f8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            perfect-fit CV
          </span>
        </h1>

        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          Build your Candidate Profile once. Then let Auto Vacancy analyse each job posting, ask the
          right questions, and generate a tailored CV and cover letter in minutes.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <SignUpAction variant="default" className="h-11 px-7 text-sm font-semibold" />
          <SignInAction className="h-11 px-7 text-sm font-semibold" />
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5657e8]">
            How it works
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#171827] sm:text-3xl">
            Three steps to a tailored application
          </h2>
        </div>

        <div className="grid gap-8 md:gap-10">
          {/* Step 1 */}
          <StepCard
            step={1}
            title="Paste the vacancy"
            description="Drop in any job description — or upload a PDF. Auto Vacancy extracts the role, company, and every required skill automatically."
            visual={<VacancyVisual />}
          />

          {/* Step 2 */}
          <StepCard
            step={2}
            title="Answer a few questions"
            description="The AI cross-references the vacancy against your Candidate Profile and asks only the questions that matter — filling in gaps with pinpoint examples from your experience."
            visual={<QuestionsVisual />}
            reverse
          />

          {/* Step 3 */}
          <StepCard
            step={3}
            title="Get a stunning, tailored CV"
            description="Receive a polished, role-specific CV (and cover letter) that highlights exactly what the employer is looking for — ready to export and send."
            visual={<CvVisual />}
          />
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-[#dfe4f3] bg-white/60 py-16 backdrop-blur">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 text-center">
          <h2 className="text-2xl font-bold text-[#171827]">Ready to apply smarter?</h2>
          <p className="text-muted-foreground">
            Create your free account in seconds and start generating tailored applications today.
          </p>
          <SignUpAction variant="default" className="h-11 px-10 text-sm font-semibold" />
        </div>
      </section>
    </main>
  );
}

/* ─── Step card layout ──────────────────────────────────────────── */

function StepCard({
  step,
  title,
  description,
  visual,
  reverse = false,
}: {
  step: number;
  title: string;
  description: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-8 rounded-2xl border border-[#dfe4f3] bg-white/80 p-6 shadow-[0_18px_54px_rgba(91,94,170,0.08)] backdrop-blur md:flex-row md:gap-12 md:p-10 ${
        reverse ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Text */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-3">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #5657e8 0%, #8e95f8 100%)",
            }}
          >
            {step}
          </span>
          <h3 className="text-xl font-semibold text-[#171827]">{title}</h3>
        </div>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {/* Visual */}
      <div className="w-full md:w-[52%] shrink-0">{visual}</div>
    </div>
  );
}

/* ─── Step 1 visual: vacancy form mock-up ───────────────────────── */

function VacancyVisual() {
  return (
    <div className="rounded-xl border border-[#dfe4f3] bg-white p-5 shadow-[0_10px_34px_rgba(92,99,180,0.08)]">
      <p className="mb-3 text-sm font-semibold text-[#171827]">Add a Vacancy</p>
      <div className="mb-3 rounded-lg border border-[#dfe4f3] bg-[#f8faff] p-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-[#171827]">Frontend Developer – Acme Inc.</span>
        <br />
        Location: Amsterdam, Netherlands (Hybrid)
        <br />
        Employment type: Full-time, Permanent
        <br />
        <br />
        <span className="font-medium text-[#171827]">About Acme Inc.</span>
        <br />
        Acme Inc. is a fast-growing tech company delivering innovative SaaS solutions...
        <br />
        <br />
        <span className="font-medium text-[#171827]">What you&apos;ll do</span>
        <br />• Develop responsive, high-performance web interfaces using React, TypeScript...
        <br />• Translate UI/UX designs from Figma into pixel-perfect code.
        <br />• Implement reusable component libraries and design systems.
      </div>

      {/* Detected skill chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["React", "TypeScript", "CSS3", "Figma", "Tailwind", "CI/CD"].map((s) => (
          <span
            key={s}
            className="rounded-full border border-[#dfe4f3] bg-[#eef2ff] px-2.5 py-0.5 text-[10px] font-medium text-[#5657e8]"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-[#dfe4f3] bg-white px-3 py-1.5 text-[11px] font-medium text-[#303348]">
          <Upload className="size-3" />
          Upload PDF
        </span>
        <span
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #5657e8 0%, #8e95f8 100%)",
          }}
        >
          Start Vacancy Understanding
          <ArrowRight className="size-3" />
        </span>
      </div>
    </div>
  );
}

/* ─── Step 2 visual: Q&A canvas mock-up ────────────────────────── */

function QuestionsVisual() {
  const floatingCards = [
    {
      q: "React experience?",
      a: "Yes — used across all projects",
      x: "4%",
      y: "0%",
    },
    {
      q: "TypeScript?",
      a: "5+ years, all professional work",
      x: "48%",
      y: "4%",
    },
    { q: "Figma / Sketch?", a: "yes", x: "4%", y: "46%" },
    {
      q: "CI/CD experience?",
      a: "Automatic lint, format & deploy",
      x: "50%",
      y: "46%",
    },
    {
      q: "CSS3 & Tailwind?",
      a: "Company A",
      x: "26%",
      y: "24%",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#dfe4f3] bg-[#f3f6ff]/70 p-5 shadow-[0_10px_34px_rgba(92,99,180,0.08)]">
      {/* Floating answered cards */}
      <div className="relative h-44">
        {floatingCards.map((card) => (
          <div
            key={card.q}
            className="absolute rounded-lg border border-[#dfe4f3] bg-white p-2.5 shadow-sm"
            style={{ left: card.x, top: card.y, maxWidth: "44%" }}
          >
            <p className="text-[9px] font-semibold text-[#5657e8]">{card.q}</p>
            <p className="mt-0.5 text-[9px] text-muted-foreground leading-snug">{card.a}</p>
          </div>
        ))}
      </div>

      {/* Active question composer */}
      <div className="mt-3 rounded-xl border border-[#dfe4f3] bg-white p-3.5 shadow-[0_18px_54px_rgba(91,94,170,0.12)]">
        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#5657e8]">
          Question 1 of 1
        </p>
        <p className="text-[11px] font-semibold leading-snug text-[#171827]">
          The vacancy asks for High-performance frontend development. Do you have experience?
        </p>
        <p className="mt-2 text-[10px] text-muted-foreground italic">
          Required hard skill not found in Candidate Profile.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#dfe4f3] bg-[#f8faff] px-3 py-2">
          <span className="flex-1 text-[10px] text-muted-foreground">
            Yes, did this during my master thesis...
          </span>
          <span
            className="grid size-5 shrink-0 place-items-center rounded-md text-white"
            style={{ background: "#5657e8" }}
          >
            <ArrowRight className="size-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3 visual: generated CV mock-up ──────────────────────── */

function CvVisual() {
  return (
    <div className="rounded-xl border border-[#dfe4f3] bg-white p-5 shadow-[0_10px_34px_rgba(92,99,180,0.08)] font-sans">
      {/* Name & tagline */}
      <p className="text-lg font-bold" style={{ color: "#2563eb" }}>
        Abel de Bruijn
      </p>
      <p className="text-[11px] font-medium text-[#171827]">Frontend Developer · Acme Inc.</p>
      <p className="text-[10px] text-muted-foreground">
        Amsterdam · personal-website.nl · LinkedIn · GitHub
      </p>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Frontend Developer based in the Netherlands with 5+ years of part-time professional frontend
        experience for web SaaS products. Background in Computer Science…
      </p>

      {/* Skills */}
      <p className="mt-3 text-[11px] font-bold" style={{ color: "#2563eb" }}>
        Skills
      </p>
      <p className="text-[10px] text-muted-foreground">
        React • TypeScript • HTML5 • CSS3 • Flexbox, Grid, Tailwind • Responsive web interfaces • 3+
        years
      </p>

      {/* Experience */}
      <p className="mt-3 text-[11px] font-bold" style={{ color: "#2563eb" }}>
        Experience
      </p>
      {[
        {
          role: "Frontend Developer @ Company A (2026)",
          desc: "Web SaaS — React, HTML5, CSS3. Built AI-assisted inspection form generation with Vitest & automatic deployment.",
        },
        {
          role: "Frontend Developer @ Company B (2021–2026)",
          desc: "Interactive educational tools, component libraries, RESTful / GraphQL APIs, state management.",
        },
      ].map((exp) => (
        <div key={exp.role} className="mt-2">
          <p className="text-[10px] font-semibold text-[#171827]">{exp.role}</p>
          <p className="text-[9.5px] leading-snug text-muted-foreground">{exp.desc}</p>
        </div>
      ))}

      {/* Education */}
      <p className="mt-3 text-[11px] font-bold" style={{ color: "#2563eb" }}>
        Education
      </p>
      <p className="text-[10px] font-semibold text-[#171827]">
        MSc. Computer Science — TU Delft (2023–Jan 2026)
      </p>
      <p className="text-[9.5px] text-muted-foreground">
        Thesis: Interactive line manipulation for large-scale visual data analysis.
      </p>

      {/* Export badge */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-[#dfe4f3] bg-[#eef2ff] px-3 py-1.5 text-[10px] font-semibold text-[#5657e8]">
          <FileText className="size-3" />
          Ready to export
        </span>
      </div>
    </div>
  );
}
