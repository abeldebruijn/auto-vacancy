"use client";

import { useState } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { isMarkdownCvFile } from "@/lib/candidate-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/profile/app-header";
import { StartProfileScreen } from "@/components/profile/start-profile-screen";

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
  const importMarkdown = useAction(api.importedCv.importMarkdown);
  const [pastedMarkdown, setPastedMarkdown] = useState("");
  const [status, setStatus] = useState<string | null>(null);

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
    <main className="mx-auto grid min-h-[calc(100vh-57px)] max-w-4xl place-items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Your Candidate Profile is ready</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Auto Vacancy helps Job Seekers prepare vacancy-specific CVs and Cover Letters from a
            reusable Candidate Profile.
          </p>
          <p>
            Next, this workspace will let you add a Vacancy and generate a tailored Application
            Package from your saved profile details.
          </p>
          <Button onClick={() => router.push("/profile")}>Review Candidate Profile</Button>
        </CardContent>
      </Card>
    </main>
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
