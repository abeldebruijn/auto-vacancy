"use client";

import { Keyboard, Sparkles, Upload, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function StartProfileScreen({
  pastedMarkdown,
  status,
  onMarkdownChange,
  onPasteImport,
  onFileImport,
  onManualStart,
}: {
  pastedMarkdown: string;
  status: string | null;
  onMarkdownChange: (value: string) => void;
  onPasteImport: () => void;
  onFileImport: (file: File) => void;
  onManualStart: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-57px)] max-w-6xl place-items-center px-4 py-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="size-4" />
            Profile
          </div>
          <CardTitle className="text-xl">
            Start with your existing CV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="size-4" />
              Paste or upload a markdown CV and the profile editor fills itself.
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cv-markdown">Paste markdown CV</Label>
              <Textarea
                id="cv-markdown"
                className="max-h-72 min-h-72 resize-none overflow-y-auto"
                placeholder="# Your name&#10;&#10;## Experience&#10;- Employer, role, achievements..."
                value={pastedMarkdown}
                onChange={(event) => onMarkdownChange(event.target.value)}
              />
              <Button
                onClick={onPasteImport}
                disabled={pastedMarkdown.trim() === ""}
              >
                <Sparkles className="size-4" />
                Extract profile from pasted CV
              </Button>
            </div>

            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center transition-colors hover:bg-muted/50">
              <Upload className="mb-3 size-8 text-muted-foreground" />
              <span className="font-medium">Upload markdown CV</span>
              <span className="mt-2 max-w-72 text-sm text-muted-foreground">
                Select a `.md` file. PDF and DOCX support comes later; markdown
                is supported now.
              </span>
              <input
                className="sr-only"
                type="file"
                accept=".md"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onFileImport(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Auto Vacancy extracts your contact details, experiences, STAR
              stories, skills, education, and hobbies. You can review and edit
              everything afterwards.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              className="w-full max-w-sm"
              variant="outline"
              onClick={onManualStart}
            >
              <Keyboard className="size-4" />
              Enter manually
            </Button>
            {status && (
              <div className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-center text-sm text-muted-foreground">
                {status}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
