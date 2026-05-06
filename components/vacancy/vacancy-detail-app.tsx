"use client";

import { useEffect, useId, useState } from "react";
import { Authenticated, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AppHeader } from "@/components/profile/app-header";
import { SignInAction } from "@/components/auth/auth-actions";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { statusLabel } from "@/components/vacancy/vacancy-utils";

type Proficiency = "low" | "medium" | "high" | "expert";
type RequiredSkill = Doc<"vacancyRequiredSkills">;
type CvDraftSnapshot = Doc<"cvDrafts">["snapshot"];
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
              <SignInAction />
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
  const addProfileSkill = useMutation(api.profile.addSkill);
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
                  pdfVersions={packageDetail?.pdfVersions ?? []}
                  status={cvStatus}
                  pending={cvActionPending}
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

function CvDraftWorkspace({
  draft,
  pdfVersions,
  status,
  pending,
  onGenerate,
  onRegenerate,
  onSave,
  onGeneratePdf,
  onChange,
}: {
  draft: CvDraftSnapshot | null;
  pdfVersions: (Doc<"cvPdfVersions"> & { downloadUrl: string | null })[];
  status: string | null;
  pending: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onSave: () => void;
  onGeneratePdf: () => void;
  onChange: (draft: CvDraftSnapshot) => void;
}) {
  if (draft === null) {
    return (
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
    );
  }

  return (
    <div className="space-y-5">
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
          label="Name"
          value={draft.name}
          onChange={(name) => onChange({ ...draft, name })}
        />
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
          label="Location"
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
        <CvField
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
      <StringListEditor
        label="Skills"
        values={draft.skills}
        maxItems={MAX_CV_SKILLS}
        onChange={(skills) => onChange({ ...draft, skills })}
      />
      <ExperienceDraftEditor draft={draft} onChange={onChange} />
      <EducationDraftEditor draft={draft} onChange={onChange} />
      <PdfVersionHistory versions={pdfVersions} />
    </div>
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

function ExperienceDraftEditor({
  draft,
  onChange,
}: {
  draft: CvDraftSnapshot;
  onChange: (draft: CvDraftSnapshot) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Experience</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              ...draft,
              experience: [
                ...draft.experience,
                {
                  sourceExperienceId: null,
                  company: "",
                  role: "",
                  period: "",
                  bullets: [""],
                },
              ],
            })
          }
        >
          <Plus className="size-3.5" />
          Add experience
        </Button>
      </div>
      {draft.experience.map((experience, index) => (
        <div key={index} className="space-y-3 rounded-md border bg-white p-3">
          <div className="flex justify-end">
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
          <div className="grid gap-3 md:grid-cols-3">
            <CvField
              label="Company"
              value={experience.company}
              onChange={(company) =>
                replaceExperience(draft, index, { ...experience, company }, onChange)
              }
            />
            <CvField
              label="Role"
              value={experience.role}
              onChange={(role) =>
                replaceExperience(draft, index, { ...experience, role }, onChange)
              }
            />
            <CvField
              label="Period"
              value={experience.period}
              onChange={(period) =>
                replaceExperience(draft, index, { ...experience, period }, onChange)
              }
            />
          </div>
          <CvTextArea
            label="Story"
            value={experience.bullets.join("\n")}
            onChange={(story) =>
              replaceExperience(
                draft,
                index,
                { ...experience, bullets: story.split("\n") },
                onChange,
              )
            }
          />
        </div>
      ))}
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
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Education</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              ...draft,
              education: [
                ...draft.education,
                {
                  sourceEducationId: null,
                  school: "",
                  degree: "",
                  period: "",
                  details: [""],
                },
              ],
            })
          }
        >
          <Plus className="size-3.5" />
          Add education
        </Button>
      </div>
      {draft.education.map((education, index) => (
        <div key={index} className="space-y-3 rounded-md border bg-white p-3">
          <div className="flex justify-end">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Remove education"
              onClick={() =>
                onChange({
                  ...draft,
                  education: draft.education.filter((_, itemIndex) => itemIndex !== index),
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <CvField
              label="School"
              value={education.school}
              onChange={(school) =>
                replaceEducation(draft, index, { ...education, school }, onChange)
              }
            />
            <CvField
              label="Degree"
              value={education.degree}
              onChange={(degree) =>
                replaceEducation(draft, index, { ...education, degree }, onChange)
              }
            />
            <CvField
              label="Period"
              value={education.period}
              onChange={(period) =>
                replaceEducation(draft, index, { ...education, period }, onChange)
              }
            />
          </div>
          <StringListEditor
            label="Details"
            values={education.details}
            onChange={(details) =>
              replaceEducation(draft, index, { ...education, details }, onChange)
            }
          />
        </div>
      ))}
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
  return (
    <section className="space-y-2">
      <Label>PDF Versions</Label>
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No PDF Versions generated yet.</p>
      ) : (
        <div className="divide-y rounded-md border bg-white">
          {versions.map((version, index) => (
            <div
              key={version._id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{index === 0 ? "Latest PDF" : "Previous PDF"}</p>
                <p className="text-muted-foreground">
                  {new Date(version.generatedAt).toLocaleString()} · revision{" "}
                  {version.draftRevision}
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
          ))}
        </div>
      )}
    </section>
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
