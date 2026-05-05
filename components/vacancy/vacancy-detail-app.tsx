"use client";

import { useEffect, useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import {
  Archive,
  ArchiveRestore,
  Camera,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AppHeader } from "@/components/profile/app-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { statusLabel } from "@/components/vacancy/vacancy-utils";

type Proficiency = "low" | "medium" | "high" | "expert";
type RequiredSkill = Doc<"vacancyRequiredSkills">;
type PackagePictureOverride =
  | { kind: "inherit" }
  | { kind: "none" }
  | { kind: "url"; url: string }
  | { kind: "storage"; storageId: Id<"_storage"> };

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
  const profileData = useQuery(api.profile.get);
  const applicationPackage = useQuery(
    api.applicationPackage.getByVacancy,
    detail === undefined || detail === null
      ? "skip"
      : { vacancyUnderstandingId: detail.vacancy._id },
  );
  const getOrCreateApplicationPackage = useMutation(api.applicationPackage.getOrCreateForVacancy);
  const uploadPackagePictureUrl = useMutation(
    api.applicationPackage.generateProfilePictureUploadUrl,
  );
  const setPackagePictureOverride = useMutation(api.applicationPackage.setProfilePictureOverride);
  const setArchived = useMutation(api.vacancy.setArchived);
  const addProfileSkill = useMutation(api.profile.addSkill);
  const [skillDialog, setSkillDialog] = useState<RequiredSkill | null>(null);
  const [proficiency, setProficiency] = useState<Proficiency>("medium");
  const [experienceIds, setExperienceIds] = useState<Id<"experiences">[]>([]);
  const [storyIds, setStoryIds] = useState<Id<"experienceStories">[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [packageStatus, setPackageStatus] = useState<string | null>(null);
  const [packagePictureUrl, setPackagePictureUrl] = useState("");
  const packageReady = applicationPackage !== undefined && applicationPackage !== null;

  useEffect(() => {
    if (detail === undefined || detail === null) return;
    if (applicationPackage !== null) return;
    void getOrCreateApplicationPackage({ vacancyUnderstandingId: detail.vacancy._id }).catch(() => {
      setPackageStatus("Failed to prepare Application Package.");
    });
  }, [applicationPackage, detail, getOrCreateApplicationPackage]);

  useEffect(() => {
    const override = applicationPackage?.applicationPackage.profilePictureOverride;
    if (override?.kind === "url") {
      setPackagePictureUrl(override.url);
    } else if (override !== undefined) {
      setPackagePictureUrl("");
    }
  }, [applicationPackage?.applicationPackage.profilePictureOverride]);

  const evidenceOptions =
    profileData === undefined || profileData === null
      ? { experiences: [], stories: [] }
      : {
          experiences: profileData.experiences.map((experience) => ({
            id: experience._id,
            label: experience.employer,
          })),
          stories: profileData.experiences.flatMap((experience) =>
            experience.stories.map((story) => ({
              id: story._id,
              label: story.projectName ?? experience.employer,
            })),
          ),
        };

  function openSkillDialog(skill: RequiredSkill) {
    setSkillDialog(skill);
    setProficiency("medium");
    setExperienceIds([]);
    setStoryIds([]);
    setSaveStatus(null);
  }

  async function saveSkillToProfile() {
    if (skillDialog === null) return;
    setSaveStatus("Saving skill...");
    await addProfileSkill({
      vacancyRequiredSkillId: skillDialog._id,
      kind: skillDialog.kind,
      name: skillDialog.name,
      proficiency,
      experienceIds,
      storyIds,
    });
    setSaveStatus("Skill saved to Candidate Profile.");
    setSkillDialog(null);
  }

  async function savePackagePictureOverride(profilePictureOverride: PackagePictureOverride) {
    if (detail === undefined || detail === null) return;
    setPackageStatus("Saving package picture...");
    try {
      await setPackagePictureOverride({
        vacancyUnderstandingId: detail.vacancy._id,
        profilePictureOverride,
      });
      setPackageStatus("Package picture saved.");
    } catch {
      setPackageStatus("Failed to save package picture. Please try again.");
    }
  }

  async function handlePackagePictureUpload(file: File) {
    if (detail === undefined || detail === null) return;
    setPackageStatus("Uploading package picture...");
    try {
      const url = await uploadPackagePictureUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      await setPackagePictureOverride({
        vacancyUnderstandingId: detail.vacancy._id,
        profilePictureOverride: { kind: "storage", storageId },
      });
      setPackageStatus("Package picture saved.");
    } catch {
      setPackageStatus("Failed to upload package picture. Please try again.");
    }
  }

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
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Application Package
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-3">
                <div>
                  <h2 className="font-medium">Profile Picture</h2>
                  <p className="text-sm text-muted-foreground">
                    Use the Candidate Profile picture or set one just for this package.
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar className="size-20 rounded-lg border border-neutral-200" size="lg">
                    {applicationPackage?.pictureUrl ? (
                      <AvatarImage
                        className="rounded-lg object-cover"
                        src={applicationPackage.pictureUrl}
                        alt=""
                      />
                    ) : (
                      <AvatarFallback className="rounded-lg bg-neutral-50">
                        <UserRound className="size-7" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <label className="text-sm">
                        <span className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 bg-background px-3 text-sm font-medium hover:bg-muted">
                          <Camera className="size-4" />
                          Upload
                        </span>
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/*"
                          disabled={!packageReady}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handlePackagePictureUpload(file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!packageReady}
                        onClick={() =>
                          void savePackagePictureOverride({
                            kind: "inherit",
                          })
                        }
                      >
                        Use Candidate Profile
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!packageReady}
                        onClick={() => void savePackagePictureOverride({ kind: "none" })}
                      >
                        <X className="size-4" />
                        Clear
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        aria-label="Package picture image URL"
                        placeholder="Image URL"
                        disabled={!packageReady}
                        value={packagePictureUrl}
                        onChange={(event) => setPackagePictureUrl(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!packageReady || packagePictureUrl.trim() === ""}
                        onClick={() =>
                          void savePackagePictureOverride({
                            kind: "url",
                            url: packagePictureUrl.trim(),
                          })
                        }
                      >
                        Save URL
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current mode:{" "}
                      {applicationPackage?.applicationPackage.profilePictureOverride.kind ??
                        "preparing"}
                    </p>
                    {packageStatus !== null ? (
                      <p className="text-sm text-muted-foreground">{packageStatus}</p>
                    ) : null}
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company research</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.researchSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No company summaries available.</p>
              ) : (
                detail.researchSummaries.map((summary) => (
                  <CompanyResearchSummary key={summary._id} summary={summary} />
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
                <div
                  key={skill._id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm"
                >
                  <span className="min-w-0">{skill.name}</span>
                  <div className="flex items-center gap-1.5">
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
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Add ${skill.name} to Candidate Profile`}
                      title="Add to Candidate Profile"
                      onClick={() => openSkillDialog(skill)}
                    >
                      {skill.matchStatus === "matched" ? (
                        <Check className="size-4" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {saveStatus !== null ? (
                <p className="pt-1 text-xs text-muted-foreground">{saveStatus}</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={skillDialog !== null} onOpenChange={(open) => !open && setSkillDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add skill to Candidate Profile</DialogTitle>
            <DialogDescription>
              Save this Vacancy skill permanently with proficiency and supporting evidence.
            </DialogDescription>
          </DialogHeader>
          {skillDialog !== null ? (
            <div className="space-y-5">
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="font-medium">{skillDialog.name}</p>
                <p className="text-sm text-muted-foreground">{skillDialog.kind} skill</p>
              </div>

              <div className="grid gap-1.5">
                <Label>Proficiency</Label>
                <Select
                  value={proficiency}
                  onValueChange={(next) => setProficiency((next ?? "medium") as Proficiency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["low", "medium", "high", "expert"] as const).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <EvidenceChecklist
                label="Experience evidence"
                emptyLabel="No experiences in the Candidate Profile yet."
                selected={experienceIds}
                options={evidenceOptions.experiences}
                onChange={setExperienceIds}
              />
              <EvidenceChecklist
                label="Story evidence"
                emptyLabel="No Experience Stories in the Candidate Profile yet."
                selected={storyIds}
                options={evidenceOptions.stories}
                onChange={setStoryIds}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSkillDialog(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveSkillToProfile()}>
              Save skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function CompanyResearchSummary({ summary }: { summary: Doc<"vacancyResearchSummaries"> }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="space-y-2 border-b pb-4 last:border-0"
      render={<article />}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{summary.sourceTitle}</h2>
        <Badge variant="outline">{summary.sourceType}</Badge>
      </div>
      <CollapsibleContent keepMounted>
        <p
          className={
            isOpen
              ? "whitespace-pre-line text-sm leading-6 text-muted-foreground"
              : "line-clamp-4 whitespace-pre-line text-sm leading-6 text-muted-foreground"
          }
        >
          {summary.summary}
        </p>
      </CollapsibleContent>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
          href={summary.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {summary.sourceUrl}
          <ExternalLink className="size-3" />
        </a>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={isOpen ? "Show less" : "Show more"}
            >
              {isOpen ? "Show less" : "Show more"}
              <ChevronDown className={isOpen ? "size-4 rotate-180" : "size-4"} />
            </Button>
          }
        />
      </div>
    </Collapsible>
  );
}

function EvidenceChecklist<TId extends Id<"experiences"> | Id<"experienceStories">>({
  label,
  emptyLabel,
  selected,
  options,
  onChange,
}: {
  label: string;
  emptyLabel: string;
  selected: TId[];
  options: { id: TId; label: string }[];
  onChange: (ids: TId[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border p-2">
          {options.map((option) => (
            <Label
              key={option.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(option.id)}
                onCheckedChange={(value) =>
                  onChange(
                    value === true
                      ? [...selected, option.id]
                      : selected.filter((id) => id !== option.id),
                  )
                }
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </Label>
          ))}
        </div>
      )}
    </div>
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
