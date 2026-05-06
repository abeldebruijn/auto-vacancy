"use client";

import { useEffect, useId, useState } from "react";
import { Authenticated, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import {
  Archive,
  ArchiveRestore,
  Camera,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AppHeader } from "@/components/profile/app-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { statusLabel } from "@/components/vacancy/vacancy-utils";
import { toast } from "sonner";

type Proficiency = "low" | "medium" | "high" | "expert";
type RequiredSkill = Doc<"vacancyRequiredSkills">;
type CvDraftSnapshot = Doc<"cvDrafts">["snapshot"];
type PackagePictureOverride =
  | { kind: "inherit" }
  | { kind: "none" }
  | { kind: "url"; url: string }
  | { kind: "storage"; storageId: Id<"_storage"> };
const MAX_CV_SKILLS = 7;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== "" ? error.message : fallback;
}

function limitCvSkills(draft: CvDraftSnapshot): CvDraftSnapshot {
  return {
    ...draft,
    skills: draft.skills.slice(0, MAX_CV_SKILLS),
  };
}

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
  const packageDetail = useQuery(
    api.applicationPackage.getByVacancy,
    detail === undefined || detail === null
      ? "skip"
      : { vacancyUnderstandingId: detail.vacancy._id },
  );
  const profileData = useQuery(api.profile.get);
  const setArchived = useMutation(api.vacancy.setArchived);
  const updateQuestionAnswer = useMutation(api.vacancy.updateQuestionAnswer);
  const deleteQuestion = useMutation(api.vacancy.deleteQuestion);
  const addProfileSkill = useMutation(api.profile.addSkill);
  const getOrCreateApplicationPackage = useMutation(api.applicationPackage.getOrCreateForVacancy);
  const uploadPackagePictureUrl = useMutation(
    api.applicationPackage.generateProfilePictureUploadUrl,
  );
  const setPackagePictureOverride = useMutation(api.applicationPackage.setProfilePictureOverride);
  const saveCvDraft = useMutation(api.applicationPackage.saveCvDraft);
  const generateCvDraft = useAction(api.applicationPackageAgents.generateCvDraft);
  const regenerateCvDraft = useAction(api.applicationPackageAgents.regenerateCvDraft);
  const generateCvPdfVersion = useAction(api.applicationPackageAgents.generateCvPdfVersion);
  const [skillDialog, setSkillDialog] = useState<RequiredSkill | null>(null);
  const [proficiency, setProficiency] = useState<Proficiency>("medium");
  const [experienceIds, setExperienceIds] = useState<Id<"experiences">[]>([]);
  const [storyIds, setStoryIds] = useState<Id<"experienceStories">[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [cvDraft, setCvDraft] = useState<CvDraftSnapshot | null>(null);
  const [cvDraftServerKey, setCvDraftServerKey] = useState<string | null>(null);
  const [cvDraftDirty, setCvDraftDirty] = useState(false);
  const [cvStatus, setCvStatus] = useState<string | null>(null);
  const [cvActionPending, setCvActionPending] = useState(false);
  const [packageStatus, setPackageStatus] = useState<string | null>(null);
  const [packagePictureUrl, setPackagePictureUrl] = useState("");
  const packageReady = packageDetail !== undefined && packageDetail !== null;
  const candidateSkillLabels =
    profileData === undefined || profileData === null
      ? []
      : profileData.skills.map((skill) => skill.name);
  const vacancySkillLabels = detail?.requiredSkills.map((skill) => skill.name) ?? [];

  useEffect(() => {
    if (packageDetail === undefined) return;
    if (packageDetail === null || packageDetail.cvDraft === null) {
      setCvDraft(null);
      setCvDraftServerKey(null);
      setCvDraftDirty(false);
      return;
    }

    const incomingKey = `${packageDetail.cvDraft._id}:${packageDetail.cvDraft.revision}`;
    if (incomingKey !== cvDraftServerKey || !cvDraftDirty) {
      setCvDraft(limitCvSkills(packageDetail.cvDraft.snapshot));
      setCvDraftServerKey(incomingKey);
      setCvDraftDirty(false);
    }
  }, [packageDetail, cvDraftDirty, cvDraftServerKey]);

  useEffect(() => {
    if (detail === undefined || detail === null) return;
    if (packageDetail !== null) return;
    void getOrCreateApplicationPackage({ vacancyUnderstandingId: detail.vacancy._id }).catch(() => {
      setPackageStatus("Failed to prepare Application Package.");
    });
  }, [detail, getOrCreateApplicationPackage, packageDetail]);

  useEffect(() => {
    const override = packageDetail?.applicationPackage.profilePictureOverride;
    if (override?.kind === "url") {
      setPackagePictureUrl(override.url);
    } else if (override !== undefined) {
      setPackagePictureUrl("");
    }
  }, [packageDetail?.applicationPackage.profilePictureOverride]);

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

  async function createCvDraft() {
    if (detail === undefined || detail === null || cvActionPending) return;
    setCvActionPending(true);
    setCvStatus("Generating CV Draft...");
    try {
      await generateCvDraft({ vacancyUnderstandingId: detail.vacancy._id });
      setCvStatus("CV Draft generated.");
    } catch (error) {
      setCvStatus(errorMessage(error, "CV Draft generation failed."));
    } finally {
      setCvActionPending(false);
    }
  }

  async function updatePackageFromVacancyQuestions() {
    if (detail === undefined || detail === null || cvActionPending) return;
    const hasDraft = packageDetail?.cvDraft !== null && packageDetail?.cvDraft !== undefined;
    const confirmed = !hasDraft
      ? true
      : window.confirm("Regenerate the CV Draft? This overwrites your saved edits.");
    if (!confirmed) return;
    setCvActionPending(true);
    setCvStatus(hasDraft ? "Regenerating CV Draft..." : "Generating CV Draft...");
    try {
      if (hasDraft) {
        await regenerateCvDraft({ vacancyUnderstandingId: detail.vacancy._id });
        setCvStatus("CV Draft regenerated.");
      } else {
        await generateCvDraft({ vacancyUnderstandingId: detail.vacancy._id });
        setCvStatus("CV Draft generated.");
      }
    } catch (error) {
      setCvStatus(errorMessage(error, "CV Draft update failed."));
    } finally {
      setCvActionPending(false);
    }
  }

  function promptPackageUpdateToast() {
    toast("Vacancy Questions updated.", {
      action: {
        label: "Update Application Package",
        onClick: () => void updatePackageFromVacancyQuestions(),
      },
    });
  }

  async function saveVacancyQuestion(questionId: Id<"vacancyQuestions">, answer: string) {
    await updateQuestionAnswer({ questionId, answer });
    promptPackageUpdateToast();
  }

  async function removeVacancyQuestion(questionId: Id<"vacancyQuestions">) {
    await deleteQuestion({ questionId });
    promptPackageUpdateToast();
  }

  async function overwriteCvDraft() {
    if (detail === undefined || detail === null || cvActionPending) return;
    const confirmed = window.confirm("Regenerate the CV Draft? This overwrites your saved edits.");
    if (!confirmed) return;
    setCvActionPending(true);
    setCvStatus("Regenerating CV Draft...");
    try {
      await regenerateCvDraft({ vacancyUnderstandingId: detail.vacancy._id });
      setCvStatus("CV Draft regenerated.");
    } catch (error) {
      setCvStatus(errorMessage(error, "CV Draft regeneration failed."));
    } finally {
      setCvActionPending(false);
    }
  }

  async function persistCvDraft() {
    if (
      packageDetail?.cvDraft === null ||
      packageDetail?.cvDraft === undefined ||
      cvDraft === null ||
      cvActionPending
    ) {
      return;
    }
    setCvActionPending(true);
    setCvStatus("Saving CV Draft...");
    try {
      await saveCvDraft({ cvDraftId: packageDetail.cvDraft._id, snapshot: cvDraft });
      setCvStatus("CV Draft saved.");
    } catch (error) {
      setCvStatus(errorMessage(error, "CV Draft save failed."));
    } finally {
      setCvActionPending(false);
    }
  }

  async function createPdfVersion() {
    if (
      packageDetail?.cvDraft === null ||
      packageDetail?.cvDraft === undefined ||
      cvDraft === null ||
      cvActionPending
    ) {
      return;
    }
    setCvActionPending(true);
    setCvStatus("Generating PDF...");
    try {
      await saveCvDraft({ cvDraftId: packageDetail.cvDraft._id, snapshot: cvDraft });
      await generateCvPdfVersion({ cvDraftId: packageDetail.cvDraft._id });
      setCvStatus("PDF Version generated.");
    } catch (error) {
      setCvStatus(errorMessage(error, "PDF generation failed."));
    } finally {
      setCvActionPending(false);
    }
  }

  function updateCvDraft(nextDraft: CvDraftSnapshot) {
    setCvDraft(limitCvSkills(nextDraft));
    setCvDraftDirty(true);
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
                <FileText className="size-5" />
                Application Package
              </CardTitle>
            </CardHeader>
            <CardContent>
              {packageDetail === undefined ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <CvDraftWorkspace
                  draft={cvDraft}
                  pictureUrl={packageDetail?.pictureUrl ?? null}
                  pictureMode={
                    packageDetail?.applicationPackage.profilePictureOverride.kind ?? "preparing"
                  }
                  packageReady={packageReady}
                  packageStatus={packageStatus}
                  packagePictureUrl={packagePictureUrl}
                  pdfVersions={packageDetail?.pdfVersions ?? []}
                  candidateSkillLabels={candidateSkillLabels}
                  vacancySkillLabels={vacancySkillLabels}
                  status={cvStatus}
                  pending={cvActionPending}
                  onPackagePictureUrlChange={setPackagePictureUrl}
                  onPackagePictureUpload={(file) => void handlePackagePictureUpload(file)}
                  onPackagePictureOverride={(override) => void savePackagePictureOverride(override)}
                  onGenerate={() => void createCvDraft()}
                  onRegenerate={() => void overwriteCvDraft()}
                  onSave={() => void persistCvDraft()}
                  onGeneratePdf={() => void createPdfVersion()}
                  onChange={updateCvDraft}
                />
              )}
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
                  <VacancyQuestionItem
                    key={question._id}
                    question={question}
                    onSave={saveVacancyQuestion}
                    onDelete={removeVacancyQuestion}
                  />
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

function CvDraftWorkspace({
  draft,
  pictureUrl,
  pictureMode,
  packageReady,
  packageStatus,
  packagePictureUrl,
  pdfVersions,
  candidateSkillLabels,
  vacancySkillLabels,
  status,
  pending,
  onPackagePictureUrlChange,
  onPackagePictureUpload,
  onPackagePictureOverride,
  onGenerate,
  onRegenerate,
  onSave,
  onGeneratePdf,
  onChange,
}: {
  draft: CvDraftSnapshot | null;
  pictureUrl: string | null;
  pictureMode: PackagePictureOverride["kind"] | "preparing";
  packageReady: boolean;
  packageStatus: string | null;
  packagePictureUrl: string;
  pdfVersions: (Doc<"cvPdfVersions"> & { downloadUrl: string | null })[];
  candidateSkillLabels: string[];
  vacancySkillLabels: string[];
  status: string | null;
  pending: boolean;
  onPackagePictureUrlChange: (value: string) => void;
  onPackagePictureUpload: (file: File) => void;
  onPackagePictureOverride: (override: PackagePictureOverride) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onSave: () => void;
  onGeneratePdf: () => void;
  onChange: (draft: CvDraftSnapshot) => void;
}) {
  const pictureControl = (
    <ProfilePicturePackageControl
      pictureUrl={pictureUrl}
      pictureMode={pictureMode}
      packageReady={packageReady}
      packageStatus={packageStatus}
      packagePictureUrl={packagePictureUrl}
      onPackagePictureUrlChange={onPackagePictureUrlChange}
      onPackagePictureUpload={onPackagePictureUpload}
      onPackagePictureOverride={onPackagePictureOverride}
    />
  );

  if (draft === null) {
    return (
      <div className="space-y-5">
        {pictureControl}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-white p-4">
          <div>
            <h2 className="font-medium">No CV Draft yet</h2>
            <p className="text-sm text-muted-foreground">
              Generate an editable CV Draft from this Vacancy and your Candidate Profile.
            </p>
          </div>
          <Button type="button" disabled={pending} onClick={onGenerate}>
            <FileText className="size-4" />
            Generate CV Draft
          </Button>
          {status !== null ? (
            <p className="basis-full text-sm text-muted-foreground">{status}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {pictureControl}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">CV Draft</h2>
          <p className="text-sm text-muted-foreground">
            Edit the structured draft, then generate a stored PDF Version.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onRegenerate}>
            <RefreshCw className="size-4" />
            Regenerate
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={onSave}>
            <Save className="size-4" />
            Save
          </Button>
          <Button type="button" disabled={pending} onClick={onGeneratePdf}>
            <Download className="size-4" />
            Generate PDF
          </Button>
        </div>
        {status !== null ? (
          <p className="basis-full text-sm text-muted-foreground">{status}</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CvField
          label="Title"
          value={draft.title}
          onChange={(title) => onChange({ ...draft, title })}
        />
        <CvField
          label="Company"
          value={draft.company}
          onChange={(company) => onChange({ ...draft, company })}
        />
        <CvField
          label="Role"
          value={draft.role}
          onChange={(role) => onChange({ ...draft, role })}
        />
        <CvField
          label="Email"
          value={draft.email ?? ""}
          onChange={(email) => onChange({ ...draft, email: email.trim() === "" ? null : email })}
        />
        <CvField
          label="Location of residence"
          value={draft.location ?? ""}
          onChange={(location) =>
            onChange({ ...draft, location: location.trim() === "" ? null : location })
          }
        />
        <CvSelect
          label="Layout"
          value={draft.layout}
          options={["compact", "flexible"]}
          onChange={(layout) => onChange({ ...draft, layout: layout as CvDraftSnapshot["layout"] })}
        />
        <CvSelect
          label="Paper"
          value={draft.paper}
          options={["a4", "letter"]}
          onChange={(paper) => onChange({ ...draft, paper: paper as CvDraftSnapshot["paper"] })}
        />
        <ColorField
          label="Accent"
          value={draft.accent}
          onChange={(accent) => onChange({ ...draft, accent })}
        />
      </div>

      <CvTextArea
        label="Summary"
        value={draft.summary}
        onChange={(summary) => onChange({ ...draft, summary })}
      />
      <StringListEditor
        label="Links"
        values={draft.links}
        onChange={(links) => onChange({ ...draft, links })}
      />
      <SkillListEditor
        label="Skills"
        values={draft.skills}
        candidateSkillLabels={candidateSkillLabels}
        vacancySkillLabels={vacancySkillLabels}
        maxItems={MAX_CV_SKILLS}
        onChange={(skills) => onChange({ ...draft, skills })}
      />
      <ExperienceDraftEditor draft={draft} onChange={onChange} />
      <EducationDraftEditor draft={draft} onChange={onChange} />
      <PdfVersionHistory versions={pdfVersions} />
    </div>
  );
}

function ProfilePicturePackageControl({
  pictureUrl,
  pictureMode,
  packageReady,
  packageStatus,
  packagePictureUrl,
  onPackagePictureUrlChange,
  onPackagePictureUpload,
  onPackagePictureOverride,
}: {
  pictureUrl: string | null;
  pictureMode: PackagePictureOverride["kind"] | "preparing";
  packageReady: boolean;
  packageStatus: string | null;
  packagePictureUrl: string;
  onPackagePictureUrlChange: (value: string) => void;
  onPackagePictureUpload: (file: File) => void;
  onPackagePictureOverride: (override: PackagePictureOverride) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">Profile Picture</h2>
        <p className="text-sm text-muted-foreground">
          Use the Candidate Profile picture or set one just for this package.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <Avatar className="size-20 rounded-lg border border-neutral-200" size="lg">
          {pictureUrl !== null ? (
            <AvatarImage className="rounded-lg object-cover" src={pictureUrl} alt="" />
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
                  if (file) onPackagePictureUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={!packageReady}
              onClick={() => onPackagePictureOverride({ kind: "inherit" })}
            >
              Use Candidate Profile
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!packageReady}
              onClick={() => onPackagePictureOverride({ kind: "none" })}
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
              onChange={(event) => onPackagePictureUrlChange(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!packageReady || packagePictureUrl.trim() === ""}
              onClick={() =>
                onPackagePictureOverride({ kind: "url", url: packagePictureUrl.trim() })
              }
            >
              Save URL
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Current mode: {pictureMode}</p>
          {packageStatus !== null ? (
            <p className="text-sm text-muted-foreground">{packageStatus}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CvField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const colorValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#2563eb";
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          className="h-9 w-16 shrink-0 p-1"
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          aria-label={`${label} hex value`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function CvTextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        className="min-h-28"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function CvSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next ?? value)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StringListEditor({
  label,
  values,
  maxItems,
  onChange,
}: {
  label: string;
  values: string[];
  maxItems?: number;
  onChange: (values: string[]) => void;
}) {
  const canAdd = maxItems === undefined || values.length < maxItems;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {maxItems !== undefined ? (
          <span className="text-xs text-muted-foreground">
            {values.length}/{maxItems}
          </span>
        ) : null}
      </div>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            className="min-w-0 flex-1"
            value={value}
            onChange={(event) =>
              onChange(
                values.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
              )
            }
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${label} item`}
            onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canAdd}
        onClick={() => onChange([...values, ""])}
      >
        <Plus className="size-3.5" />
        Add
      </Button>
    </div>
  );
}

function SkillListEditor({
  label,
  values,
  candidateSkillLabels,
  vacancySkillLabels,
  maxItems,
  onChange,
}: {
  label: string;
  values: string[];
  candidateSkillLabels: string[];
  vacancySkillLabels: string[];
  maxItems: number;
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const canAdd = values.length < maxItems;
  const used = new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const candidateOptions = uniqueSkillLabels(candidateSkillLabels).filter(
    (skill) => !used.has(skill.toLowerCase()),
  );
  const vacancyOptions = uniqueSkillLabels(vacancySkillLabels).filter(
    (skill) => !used.has(skill.toLowerCase()),
  );
  const hasOptions = candidateOptions.length > 0 || vacancyOptions.length > 0;

  function replaceSkill(index: number, value: string) {
    onChange(values.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {values.length}/{maxItems}
          </span>
          <CollapsibleTrigger
            render={
              <Button type="button" size="sm" variant="outline">
                {isOpen ? "Hide" : "Edit"}
                <ChevronDown className={isOpen ? "size-3.5 rotate-180" : "size-3.5"} />
              </Button>
            }
          />
        </div>
      </div>
      {!isOpen ? (
        <div className="rounded-md border bg-white px-3 py-2 text-sm">
          {values[0] ?? "No skills selected."}
        </div>
      ) : null}
      <CollapsibleContent>
        <div className="space-y-2">
          {values.map((value, index) => (
            <div key={index} className="flex gap-2">
              <SkillSelector
                value={value}
                candidateOptions={candidateOptions}
                vacancyOptions={vacancyOptions}
                onChange={(next) => replaceSkill(index, next)}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Remove skill"
                onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canAdd || !hasOptions}
            onClick={() => {
              const next = vacancyOptions[0] ?? candidateOptions[0];
              if (next !== undefined) onChange([...values, next]);
            }}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SkillSelector({
  value,
  candidateOptions,
  vacancyOptions,
  onChange,
}: {
  value: string;
  candidateOptions: string[];
  vacancyOptions: string[];
  onChange: (value: string) => void;
}) {
  const fallbackValue = value.trim() === "" ? "__empty" : value;
  return (
    <Select value={fallbackValue} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="min-w-0 flex-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {value.trim() !== "" ? (
          <SelectItem value={value}>{value}</SelectItem>
        ) : (
          <SelectItem value="__empty">Select skill</SelectItem>
        )}
        {vacancyOptions.length > 0 ? (
          <SelectGroup>
            <SelectLabel>Vacancy skills</SelectLabel>
            {vacancyOptions.map((skill) => (
              <SelectItem key={`vacancy-${skill}`} value={skill}>
                {skill}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        {candidateOptions.length > 0 ? (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Candidate Profile skills</SelectLabel>
              {candidateOptions.map((skill) => (
                <SelectItem key={`profile-${skill}`} value={skill}>
                  {skill}
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        ) : null}
      </SelectContent>
    </Select>
  );
}

function uniqueSkillLabels(values: string[]) {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed === "" || seen.has(key)) continue;
    seen.add(key);
    labels.push(trimmed);
  }
  return labels;
}

function ExperienceDraftEditor({
  draft,
  onChange,
}: {
  draft: CvDraftSnapshot;
  onChange: (draft: CvDraftSnapshot) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [editingExperience, setEditingExperience] = useState<
    CvDraftSnapshot["experience"][number] | null
  >(null);

  function openEditor(index: number | "new") {
    setEditingIndex(index);
    setEditingExperience(
      index === "new"
        ? {
            sourceExperienceId: null,
            company: "",
            role: "",
            period: "",
            bullets: [""],
          }
        : draft.experience[index],
    );
  }

  function closeEditor() {
    setEditingIndex(null);
    setEditingExperience(null);
  }

  function saveEditor() {
    if (editingExperience === null || editingIndex === null) return;
    if (editingIndex === "new") {
      onChange({ ...draft, experience: [...draft.experience, editingExperience] });
    } else {
      replaceExperience(draft, editingIndex, editingExperience, onChange);
    }
    closeEditor();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Experience</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => openEditor("new")}>
          <Plus className="size-3.5" />
          Add experience
        </Button>
      </div>
      <div className="space-y-2">
        {draft.experience.map((experience, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-md border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <button type="button" className="min-w-0 text-left" onClick={() => openEditor(index)}>
              <p className="font-medium">
                {experience.company || "Untitled company"} · {experience.role || "Untitled role"}
              </p>
              <p className="text-sm text-muted-foreground">{experience.period || "No period"}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {experience.bullets.filter(Boolean).join(" ") || "No story yet."}
              </p>
            </button>
            <div className="flex items-start justify-end gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Edit experience"
                onClick={() => openEditor(index)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Remove experience"
                onClick={() =>
                  onChange({
                    ...draft,
                    experience: draft.experience.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={editingExperience !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIndex === "new" ? "Add experience" : "Edit experience"}
            </DialogTitle>
            <DialogDescription>Keep the CV story concise and vacancy-specific.</DialogDescription>
          </DialogHeader>
          {editingExperience !== null ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <CvField
                  label="Company"
                  value={editingExperience.company}
                  onChange={(company) => setEditingExperience({ ...editingExperience, company })}
                />
                <CvField
                  label="Role"
                  value={editingExperience.role}
                  onChange={(role) => setEditingExperience({ ...editingExperience, role })}
                />
                <CvField
                  label="Period"
                  value={editingExperience.period}
                  onChange={(period) => setEditingExperience({ ...editingExperience, period })}
                />
              </div>
              <CvTextArea
                label="Story"
                value={editingExperience.bullets.join("\n")}
                onChange={(story) =>
                  setEditingExperience({ ...editingExperience, bullets: story.split("\n") })
                }
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEditor}>
              Save experience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function EducationDraftEditor({
  draft,
  onChange,
}: {
  draft: CvDraftSnapshot;
  onChange: (draft: CvDraftSnapshot) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [editingEducation, setEditingEducation] = useState<
    CvDraftSnapshot["education"][number] | null
  >(null);

  function openEditor(index: number | "new") {
    setEditingIndex(index);
    setEditingEducation(
      index === "new"
        ? {
            sourceEducationId: null,
            school: "",
            degree: "",
            period: "",
            details: [""],
          }
        : draft.education[index],
    );
  }

  function closeEditor() {
    setEditingIndex(null);
    setEditingEducation(null);
  }

  function saveEditor() {
    if (editingEducation === null || editingIndex === null) return;
    if (editingIndex === "new") {
      onChange({ ...draft, education: [...draft.education, editingEducation] });
    } else {
      replaceEducation(draft, editingIndex, editingEducation, onChange);
    }
    closeEditor();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Education</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => openEditor("new")}>
          <Plus className="size-3.5" />
          Add education
        </Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Degree</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draft.education.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No education yet.
                </TableCell>
              </TableRow>
            ) : (
              draft.education.map((education, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{education.school || "Untitled"}</TableCell>
                  <TableCell>{education.degree || "Untitled"}</TableCell>
                  <TableCell>{education.period || "No period"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {education.details.filter(Boolean).join(" · ") || "No details"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Edit education"
                        onClick={() => openEditor(index)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Remove education"
                        onClick={() =>
                          onChange({
                            ...draft,
                            education: draft.education.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={editingEducation !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIndex === "new" ? "Add education" : "Edit education"}</DialogTitle>
            <DialogDescription>
              Update the education details used in the CV Draft.
            </DialogDescription>
          </DialogHeader>
          {editingEducation !== null ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <CvField
                  label="School"
                  value={editingEducation.school}
                  onChange={(school) => setEditingEducation({ ...editingEducation, school })}
                />
                <CvField
                  label="Degree"
                  value={editingEducation.degree}
                  onChange={(degree) => setEditingEducation({ ...editingEducation, degree })}
                />
                <CvField
                  label="Period"
                  value={editingEducation.period}
                  onChange={(period) => setEditingEducation({ ...editingEducation, period })}
                />
              </div>
              <StringListEditor
                label="Details"
                values={editingEducation.details}
                onChange={(details) => setEditingEducation({ ...editingEducation, details })}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEditor}>
              Save education
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function replaceExperience(
  draft: CvDraftSnapshot,
  index: number,
  experience: CvDraftSnapshot["experience"][number],
  onChange: (draft: CvDraftSnapshot) => void,
) {
  onChange({
    ...draft,
    experience: draft.experience.map((item, itemIndex) =>
      itemIndex === index ? experience : item,
    ),
  });
}

function replaceEducation(
  draft: CvDraftSnapshot,
  index: number,
  education: CvDraftSnapshot["education"][number],
  onChange: (draft: CvDraftSnapshot) => void,
) {
  onChange({
    ...draft,
    education: draft.education.map((item, itemIndex) => (itemIndex === index ? education : item)),
  });
}

function PdfVersionHistory({
  versions,
}: {
  versions: (Doc<"cvPdfVersions"> & { downloadUrl: string | null })[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [latest, ...previous] = versions;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>PDF Versions</Label>
        {previous.length > 0 ? (
          <CollapsibleTrigger
            render={
              <Button type="button" size="sm" variant="outline">
                {isOpen ? "Hide previous" : `Show previous (${previous.length})`}
                <ChevronDown className={isOpen ? "size-3.5 rotate-180" : "size-3.5"} />
              </Button>
            }
          />
        ) : null}
      </div>
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No PDF Versions generated yet.</p>
      ) : (
        <div className="divide-y rounded-md border bg-white">
          {latest !== undefined ? <PdfVersionRow version={latest} label="Latest PDF" /> : null}
          <CollapsibleContent keepMounted>
            {isOpen
              ? previous.map((version) => (
                  <PdfVersionRow key={version._id} version={version} label="Previous PDF" />
                ))
              : null}
          </CollapsibleContent>
        </div>
      )}
    </Collapsible>
  );
}

function PdfVersionRow({
  version,
  label,
}: {
  version: Doc<"cvPdfVersions"> & { downloadUrl: string | null };
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">
          {new Date(version.generatedAt).toLocaleString()} · revision {version.draftRevision}
        </p>
      </div>
      {version.downloadUrl !== null ? (
        <a
          className={buttonVariants({ variant: "outline", size: "sm" })}
          href={version.downloadUrl}
          download={version.filename}
        >
          <Download className="size-3.5" />
          Download
        </a>
      ) : (
        <Badge variant="secondary">Unavailable</Badge>
      )}
    </div>
  );
}

function VacancyQuestionItem({
  question,
  onSave,
  onDelete,
}: {
  question: Doc<"vacancyQuestions">;
  onSave: (questionId: Id<"vacancyQuestions">, answer: string) => Promise<void>;
  onDelete: (questionId: Id<"vacancyQuestions">) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setAnswer(question.answer ?? "");
  }, [question.answer]);

  async function save() {
    setStatus("Saving answer...");
    try {
      await onSave(question._id, answer);
      setStatus(null);
      setIsEditing(false);
    } catch (error) {
      setStatus(errorMessage(error, "Failed to save answer."));
    }
  }

  async function remove() {
    const confirmed = window.confirm("Delete this Vacancy Question?");
    if (!confirmed) return;
    setStatus("Deleting question...");
    try {
      await onDelete(question._id);
      setStatus(null);
    } catch (error) {
      setStatus(errorMessage(error, "Failed to delete question."));
    }
  }

  return (
    <div className="rounded-md border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{question.prompt}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {question.answer ?? "No answer yet."}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Edit Vacancy Question"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Delete Vacancy Question"
            onClick={() => void remove()}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {status !== null ? <p className="mt-2 text-sm text-muted-foreground">{status}</p> : null}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vacancy Question</DialogTitle>
            <DialogDescription>Changes stay on the Vacancy Understanding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">{question.prompt}</div>
            <CvTextArea label="Answer" value={answer} onChange={setAnswer} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={answer.trim() === ""} onClick={() => void save()}>
              Save answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
