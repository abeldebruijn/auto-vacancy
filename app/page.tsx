"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Authenticated,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  BriefcaseBusiness,
  Camera,
  Check,
  GraduationCap,
  Heart,
  Keyboard,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Picture =
  | { kind: "none" }
  | { kind: "url"; url: string }
  | { kind: "storage"; storageId: Id<"_storage"> };

type StoryForm = {
  id: Id<"experienceStories"> | null;
  projectName: string | null;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
};

type ExperienceForm = {
  id: Id<"experiences"> | null;
  employer: string;
  contractType: "full-time" | "part-time" | null;
  isHobbyProject: boolean;
  fromYear: number | null;
  toYear: number | null;
  fromMonth: number | null;
  toMonth: number | null;
  isCurrent: boolean;
  stories: StoryForm[];
};

type SkillForm = {
  id: Id<"skills"> | null;
  kind: "soft" | "hard";
  name: string;
  proficiency: "low" | "medium" | "high" | "expert";
  experienceIds: Id<"experiences">[];
  storyIds: Id<"experienceStories">[];
};

type EducationForm = {
  id: Id<"educations"> | null;
  institute: string;
  fromYear: number | null;
  toYear: number | null;
  fromMonth: number | null;
  toMonth: number | null;
  isCurrent: boolean;
  major: string | null;
  details: string | null;
};

type HobbyForm = {
  id: Id<"hobbies"> | null;
  title: string;
  fromYear: number | null;
  toYear: number | null;
  isCurrent: boolean;
  details: string | null;
};

type EvidenceId = Id<"experiences"> | Id<"experienceStories">;

type EvidenceOptions = {
  experiences: { id: Id<"experiences">; label: string }[];
  stories: { id: Id<"experienceStories">; label: string }[];
};

type ImportedCvItem = {
  _id: Id<"importedCvs">;
  filename: string;
  status: "processing" | "applied" | "preview" | "failed";
  error: string | null;
};

type ProfileData = {
  profile: Omit<
    ProfileForm,
    "experiences" | "skills" | "educations" | "hobbies"
  >;
  pictureUrl: string | null;
  experiences: (Omit<ExperienceForm, "id" | "stories"> & {
    _id: Id<"experiences">;
    stories: (Omit<StoryForm, "id"> & { _id: Id<"experienceStories"> })[];
  })[];
  skills: (Omit<SkillForm, "id"> & { _id: Id<"skills"> })[];
  educations: (Omit<EducationForm, "id"> & { _id: Id<"educations"> })[];
  hobbies: (Omit<HobbyForm, "id"> & { _id: Id<"hobbies"> })[];
};

type ProfileForm = {
  name: string;
  birthday: string | null;
  portfolioLink: string | null;
  email: string | null;
  placeOfResidence: string | null;
  phoneNumber: string | null;
  linkedinLink: string | null;
  otherSocialLinks: string[];
  otherDetails: string | null;
  characteristics: string[];
  nextSteps: string[];
  profilePicture: Picture;
  experiences: ExperienceForm[];
  skills: SkillForm[];
  educations: EducationForm[];
  hobbies: HobbyForm[];
};

const emptyProfile: ProfileForm = {
  name: "",
  birthday: null,
  portfolioLink: null,
  email: null,
  placeOfResidence: null,
  phoneNumber: null,
  linkedinLink: null,
  otherSocialLinks: [],
  otherDetails: null,
  characteristics: [],
  nextSteps: [],
  profilePicture: { kind: "none" },
  experiences: [],
  skills: [],
  educations: [],
  hobbies: [],
};

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BriefcaseBusiness className="size-4" />
            Auto Vacancy
          </div>
          <UserButton />
        </div>
      </header>
      <Authenticated>
        <ProfileWorkspace />
      </Authenticated>
      <Unauthenticated>
        <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Sign in to build your Candidate Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
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
      </Unauthenticated>
    </div>
  );
}

function ProfileWorkspace() {
  const profileData = useQuery(api.profile.get);
  const importedCvs = useQuery(api.profile.listImportedCvs) ?? [];
  const importMarkdown = useAction(api.importedCv.importMarkdown);
  const saveProfile = useMutation(api.profile.update);
  const applyPreview = useMutation(api.profile.applyImportedCvPreview);
  const uploadUrl = useMutation(api.profile.generateProfilePictureUploadUrl);
  const setPicture = useMutation(api.profile.setPicture);
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [status, setStatus] = useState<string | null>(null);
  const [manualStarted, setManualStarted] = useState(false);
  const [pastedMarkdown, setPastedMarkdown] = useState("");

  useEffect(() => {
    if (profileData === undefined || profileData === null) return;
    // The editor keeps a mutable draft while Convex owns the persisted profile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(fromProfileData(profileData as ProfileData));
  }, [profileData]);

  const evidenceOptions = useMemo(() => {
    const experiences = form.experiences
      .filter((experience) => experience.id)
      .map((experience) => ({
        id: experience.id!,
        label: experience.employer,
      }));
    const stories = form.experiences.flatMap((experience) =>
      experience.stories
        .filter((story) => story.id)
        .map((story) => ({
          id: story.id!,
          label: story.projectName || experience.employer,
        })),
    );
    return { experiences, stories };
  }, [form.experiences]);

  async function handleImportMarkdown(filename: string, markdown: string) {
    if (markdown.trim() === "") {
      setStatus("Add markdown content first.");
      return;
    }
    setStatus("Extracting Imported CV...");
    const result = await importMarkdown({ filename, markdown });
    setStatus(
      result.status === "applied"
        ? "Imported CV applied."
        : result.status === "preview"
          ? "Replacement preview ready."
          : "Extraction failed.",
    );
  }

  async function handleImport(file: File) {
    if (!file.name.toLowerCase().endsWith(".md")) {
      setStatus("Upload a .md file.");
      return;
    }
    await handleImportMarkdown(file.name, await file.text());
  }

  async function handleSave() {
    setStatus("Saving Candidate Profile...");
    await saveProfile({ profile: normalizeForm(form) });
    setStatus("Candidate Profile saved.");
  }

  async function handlePictureUpload(file: File) {
    setStatus("Uploading profile picture...");
    const url = await uploadUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    await setPicture({ profilePicture: { kind: "storage", storageId } });
    setForm((current) => ({
      ...current,
      profilePicture: { kind: "storage", storageId },
    }));
    setStatus("Profile picture saved.");
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

  if (profileData === null && !manualStarted) {
    return (
      <StartProfileScreen
        pastedMarkdown={pastedMarkdown}
        status={status}
        onMarkdownChange={setPastedMarkdown}
        onPasteImport={() =>
          void handleImportMarkdown("pasted-cv.md", pastedMarkdown)
        }
        onFileImport={(file) => void handleImport(file)}
        onManualStart={() => {
          setForm(emptyProfile);
          setManualStarted(true);
          setStatus("Manual profile started. Add your details and save.");
        }}
      />
    );
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Panel title="Imported CV" icon={<Upload className="size-4" />}>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4" />
              Upload once, profile updates automatically
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Drop in a markdown CV and Auto Vacancy extracts your details,
              experiences, skills, education, and hobbies into the editor below.
            </p>
          </div>
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center text-sm">
            <Upload className="mb-2 size-5" />
            <span className="font-medium">Upload markdown CV</span>
            <span className="mt-1 max-w-56 text-xs text-muted-foreground">
              The Candidate Profile fields will be filled in automatically.
            </span>
            <input
              className="sr-only"
              type="file"
              accept=".md"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {status && (
            <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {status}
            </div>
          )}
          <div className="mt-4 space-y-2">
            {(importedCvs as ImportedCvItem[]).map((item) => (
              <div
                key={item._id}
                className="rounded-md border border-neutral-200 p-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.filename}</span>
                  <Badge
                    variant={
                      item.status === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                {item.status === "preview" && (
                  <Button
                    className="mt-2 w-full"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setStatus("Applying replacement preview...");
                      await applyPreview({ importedCvId: item._id });
                      setStatus("Replacement applied.");
                    }}
                  >
                    <Check className="size-3.5" />
                    Apply preview
                  </Button>
                )}
                {item.error && (
                  <p className="mt-2 text-red-600">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Profile Picture" icon={<Camera className="size-4" />}>
          <div className="flex items-center gap-3">
            <Avatar className="size-20 rounded-lg" size="lg">
              {profileData?.pictureUrl ? (
                <AvatarImage
                  className="rounded-lg"
                  src={profileData.pictureUrl}
                  alt=""
                />
              ) : (
                <AvatarFallback className="rounded-lg">
                  <UserRound className="size-6" />
                </AvatarFallback>
              )}
            </Avatar>
            <label className="text-sm">
              <span className="rounded-md border border-neutral-200 px-2 py-1">
                Upload
              </span>
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handlePictureUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <Field
            label="Image URL"
            value={
              form.profilePicture.kind === "url" ? form.profilePicture.url : ""
            }
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                profilePicture: value
                  ? { kind: "url", url: value }
                  : { kind: "none" },
              }))
            }
          />
        </Panel>
      </aside>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Candidate Profile</CardTitle>
            <CardAction>
              <Button onClick={() => void handleSave()}>
                <Save className="size-4" />
                Save
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">
              Reusable source of truth for future application materials.
            </p>
          </CardContent>
        </Card>

        <Panel title="General Details" icon={<UserRound className="size-4" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Name"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
            />
            <Field
              label="Birthday"
              value={form.birthday ?? ""}
              onChange={(birthday) => setForm({ ...form, birthday })}
            />
            <Field
              label="Email"
              value={form.email ?? ""}
              onChange={(email) => setForm({ ...form, email })}
            />
            <Field
              label="Phone"
              value={form.phoneNumber ?? ""}
              onChange={(phoneNumber) => setForm({ ...form, phoneNumber })}
            />
            <Field
              label="Place of residence"
              value={form.placeOfResidence ?? ""}
              onChange={(placeOfResidence) =>
                setForm({ ...form, placeOfResidence })
              }
            />
            <Field
              label="Portfolio link"
              value={form.portfolioLink ?? ""}
              onChange={(portfolioLink) => setForm({ ...form, portfolioLink })}
            />
            <Field
              label="LinkedIn link"
              value={form.linkedinLink ?? ""}
              onChange={(linkedinLink) => setForm({ ...form, linkedinLink })}
            />
          </div>
          <ListField
            label="Other social links"
            values={form.otherSocialLinks}
            onChange={(otherSocialLinks) =>
              setForm({ ...form, otherSocialLinks })
            }
          />
          <ListField
            label="What characterises me"
            values={form.characteristics}
            onChange={(characteristics) =>
              setForm({ ...form, characteristics })
            }
          />
          <ListField
            label="In my next steps I would like to"
            values={form.nextSteps}
            onChange={(nextSteps) => setForm({ ...form, nextSteps })}
          />
          <TextArea
            label="Other details"
            value={form.otherDetails ?? ""}
            onChange={(otherDetails) => setForm({ ...form, otherDetails })}
          />
        </Panel>

        <Panel
          title="Experiences"
          icon={<BriefcaseBusiness className="size-4" />}
        >
          <SectionList
            items={form.experiences}
            addLabel="Add experience"
            onAdd={() =>
              setForm({
                ...form,
                experiences: [...form.experiences, newExperience()],
              })
            }
            render={(experience, index) => (
              <ExperienceEditor
                experience={experience}
                onChange={(next) =>
                  replaceAt(form.experiences, index, next, (experiences) =>
                    setForm({ ...form, experiences }),
                  )
                }
                onRemove={() =>
                  removeAt(form.experiences, index, (experiences) =>
                    setForm({ ...form, experiences }),
                  )
                }
              />
            )}
          />
        </Panel>

        <Panel title="Skills" icon={<Sparkles className="size-4" />}>
          <SectionList
            items={form.skills}
            addLabel="Add skill"
            onAdd={() =>
              setForm({ ...form, skills: [...form.skills, newSkill("hard")] })
            }
            render={(skill, index) => (
              <SkillEditor
                skill={skill}
                evidenceOptions={evidenceOptions}
                onChange={(next) =>
                  replaceAt(form.skills, index, next, (skills) =>
                    setForm({ ...form, skills }),
                  )
                }
                onRemove={() =>
                  removeAt(form.skills, index, (skills) =>
                    setForm({ ...form, skills }),
                  )
                }
              />
            )}
          />
        </Panel>

        <Panel title="Education" icon={<GraduationCap className="size-4" />}>
          <SectionList
            items={form.educations}
            addLabel="Add education"
            onAdd={() =>
              setForm({
                ...form,
                educations: [...form.educations, newEducation()],
              })
            }
            render={(education, index) => (
              <EducationEditor
                education={education}
                onChange={(next) =>
                  replaceAt(form.educations, index, next, (educations) =>
                    setForm({ ...form, educations }),
                  )
                }
                onRemove={() =>
                  removeAt(form.educations, index, (educations) =>
                    setForm({ ...form, educations }),
                  )
                }
              />
            )}
          />
        </Panel>

        <Panel title="Hobbies" icon={<Heart className="size-4" />}>
          <SectionList
            items={form.hobbies}
            addLabel="Add hobby"
            onAdd={() =>
              setForm({ ...form, hobbies: [...form.hobbies, newHobby()] })
            }
            render={(hobby, index) => (
              <HobbyEditor
                hobby={hobby}
                onChange={(next) =>
                  replaceAt(form.hobbies, index, next, (hobbies) =>
                    setForm({ ...form, hobbies }),
                  )
                }
                onRemove={() =>
                  removeAt(form.hobbies, index, (hobbies) =>
                    setForm({ ...form, hobbies }),
                  )
                }
              />
            )}
          />
        </Panel>
      </section>
    </main>
  );
}

function StartProfileScreen({
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
          <div className="flex items-center gap-2 text-lg text-muted-foreground">
            <UserRound className="size-4" />
            Start with your existing CV
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cv-markdown">Paste markdown CV</Label>
              <Textarea
                id="cv-markdown"
                className="min-h-72 resize-y"
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

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Textarea
        className="min-h-24"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            className="min-w-0 flex-1"
            value={value}
            onChange={(event) =>
              replaceAt(values, index, event.target.value, onChange)
            }
          />
          <IconButton
            label="Remove"
            onClick={() => removeAt(values, index, onChange)}
          >
            <Trash2 />
          </IconButton>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange([...values, ""])}
      >
        <Plus className="size-3.5" />
        Add
      </Button>
    </div>
  );
}

function SectionList<T>({
  items,
  addLabel,
  onAdd,
  render,
}: {
  items: T[];
  addLabel: string;
  onAdd: () => void;
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card key={index} size="sm" className="shadow-none">
          <CardContent className="space-y-3">{render(item, index)}</CardContent>
        </Card>
      ))}
      <Button size="sm" variant="outline" onClick={onAdd}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

function ExperienceEditor({
  experience,
  onChange,
  onRemove,
}: {
  experience: ExperienceForm;
  onChange: (experience: ExperienceForm) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <IconButton label="Remove experience" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Employer"
          value={experience.employer}
          onChange={(employer) => onChange({ ...experience, employer })}
        />
        <FormSelect
          label="Contract"
          value={experience.contractType ?? ""}
          options={["", "full-time", "part-time"]}
          onChange={(value) =>
            onChange({
              ...experience,
              contractType:
                value === "" ? null : (value as "full-time" | "part-time"),
            })
          }
        />
        <NumberField
          label="From year"
          value={experience.fromYear}
          onChange={(fromYear) => onChange({ ...experience, fromYear })}
        />
        <NumberField
          label="To year"
          value={experience.toYear}
          onChange={(toYear) => onChange({ ...experience, toYear })}
        />
        <NumberField
          label="From month"
          value={experience.fromMonth}
          onChange={(fromMonth) => onChange({ ...experience, fromMonth })}
        />
        <NumberField
          label="To month"
          value={experience.toMonth}
          onChange={(toMonth) => onChange({ ...experience, toMonth })}
        />
      </div>
      <Checks
        values={[
          [
            "Current",
            experience.isCurrent,
            (checked) => onChange({ ...experience, isCurrent: checked }),
          ],
          [
            "Hobby project",
            experience.isHobbyProject,
            (checked) => onChange({ ...experience, isHobbyProject: checked }),
          ],
        ]}
      />
      <SectionList
        items={experience.stories}
        addLabel="Add story"
        onAdd={() =>
          onChange({
            ...experience,
            stories: [...experience.stories, newStory()],
          })
        }
        render={(story, index) => (
          <StoryEditor
            story={story}
            onChange={(next) =>
              replaceAt(experience.stories, index, next, (stories) =>
                onChange({ ...experience, stories }),
              )
            }
            onRemove={() =>
              removeAt(experience.stories, index, (stories) =>
                onChange({ ...experience, stories }),
              )
            }
          />
        )}
      />
    </div>
  );
}

function StoryEditor({
  story,
  onChange,
  onRemove,
}: {
  story: StoryForm;
  onChange: (story: StoryForm) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <IconButton label="Remove story" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
      <Field
        label="Project name"
        value={story.projectName ?? ""}
        onChange={(projectName) => onChange({ ...story, projectName })}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <TextArea
          label="Situation"
          value={story.situation ?? ""}
          onChange={(situation) => onChange({ ...story, situation })}
        />
        <TextArea
          label="Task"
          value={story.task ?? ""}
          onChange={(task) => onChange({ ...story, task })}
        />
        <TextArea
          label="Action"
          value={story.action ?? ""}
          onChange={(action) => onChange({ ...story, action })}
        />
        <TextArea
          label="Result"
          value={story.result ?? ""}
          onChange={(result) => onChange({ ...story, result })}
        />
      </div>
    </div>
  );
}

function SkillEditor({
  skill,
  evidenceOptions,
  onChange,
  onRemove,
}: {
  skill: SkillForm;
  evidenceOptions: EvidenceOptions;
  onChange: (skill: SkillForm) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <IconButton label="Remove skill" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <FormSelect
          label="Kind"
          value={skill.kind}
          options={["soft", "hard"]}
          onChange={(kind) =>
            onChange({ ...skill, kind: kind as "soft" | "hard" })
          }
        />
        <Field
          label="Name"
          value={skill.name}
          onChange={(name) => onChange({ ...skill, name })}
        />
        <FormSelect
          label="Proficiency"
          value={skill.proficiency}
          options={["low", "medium", "high", "expert"]}
          onChange={(proficiency) =>
            onChange({
              ...skill,
              proficiency: proficiency as SkillForm["proficiency"],
            })
          }
        />
      </div>
      <Evidence
        label="Experience evidence"
        selected={skill.experienceIds}
        options={evidenceOptions.experiences}
        onChange={(experienceIds) => onChange({ ...skill, experienceIds })}
      />
      <Evidence
        label="Story evidence"
        selected={skill.storyIds}
        options={evidenceOptions.stories}
        onChange={(storyIds) => onChange({ ...skill, storyIds })}
      />
    </div>
  );
}

function EducationEditor({
  education,
  onChange,
  onRemove,
}: {
  education: EducationForm;
  onChange: (education: EducationForm) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <IconButton label="Remove education" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Institute"
          value={education.institute}
          onChange={(institute) => onChange({ ...education, institute })}
        />
        <Field
          label="Major"
          value={education.major ?? ""}
          onChange={(major) => onChange({ ...education, major })}
        />
        <NumberField
          label="From year"
          value={education.fromYear}
          onChange={(fromYear) => onChange({ ...education, fromYear })}
        />
        <NumberField
          label="To year"
          value={education.toYear}
          onChange={(toYear) => onChange({ ...education, toYear })}
        />
        <NumberField
          label="From month"
          value={education.fromMonth}
          onChange={(fromMonth) => onChange({ ...education, fromMonth })}
        />
        <NumberField
          label="To month"
          value={education.toMonth}
          onChange={(toMonth) => onChange({ ...education, toMonth })}
        />
      </div>
      <Checks
        values={[
          [
            "Current",
            education.isCurrent,
            (isCurrent) => onChange({ ...education, isCurrent }),
          ],
        ]}
      />
      <TextArea
        label="Details"
        value={education.details ?? ""}
        onChange={(details) => onChange({ ...education, details })}
      />
    </div>
  );
}

function HobbyEditor({
  hobby,
  onChange,
  onRemove,
}: {
  hobby: HobbyForm;
  onChange: (hobby: HobbyForm) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <IconButton label="Remove hobby" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label="Title"
          value={hobby.title}
          onChange={(title) => onChange({ ...hobby, title })}
        />
        <NumberField
          label="From year"
          value={hobby.fromYear}
          onChange={(fromYear) => onChange({ ...hobby, fromYear })}
        />
        <NumberField
          label="To year"
          value={hobby.toYear}
          onChange={(toYear) => onChange({ ...hobby, toYear })}
        />
      </div>
      <Checks
        values={[
          [
            "Current",
            hobby.isCurrent,
            (isCurrent) => onChange({ ...hobby, isCurrent }),
          ],
        ]}
      />
      <TextArea
        label="Details"
        value={hobby.details ?? ""}
        onChange={(details) => onChange({ ...hobby, details })}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field
      label={label}
      value={value?.toString() ?? ""}
      onChange={(next) => onChange(next === "" ? null : Number(next))}
    />
  );
}

function FormSelect({
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
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <SelectRoot value={value} onValueChange={(next) => onChange(next ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option || "None"}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </div>
  );
}

function Checks({
  values,
}: {
  values: [string, boolean, (checked: boolean) => void][];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {values.map(([label, checked, onChange]) => (
        <Label key={label} className="flex items-center gap-2">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => onChange(value === true)}
          />
          {label}
        </Label>
      ))}
    </div>
  );
}

function Evidence<TId extends EvidenceId>({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: TId[];
  options: { id: TId; label: string }[];
  onChange: (ids: TId[]) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Label
            key={option.id}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs"
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
            {option.label}
          </Label>
        ))}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function replaceAt<T>(
  items: T[],
  index: number,
  item: T,
  onChange: (items: T[]) => void,
) {
  onChange(
    items.map((current, currentIndex) =>
      currentIndex === index ? item : current,
    ),
  );
}

function removeAt<T>(
  items: T[],
  index: number,
  onChange: (items: T[]) => void,
) {
  onChange(items.filter((_, currentIndex) => currentIndex !== index));
}

function newStory(): StoryForm {
  return {
    id: null,
    projectName: null,
    situation: null,
    task: null,
    action: null,
    result: null,
  };
}

function newExperience(): ExperienceForm {
  return {
    id: null,
    employer: "",
    contractType: null,
    isHobbyProject: false,
    fromYear: null,
    toYear: null,
    fromMonth: null,
    toMonth: null,
    isCurrent: false,
    stories: [newStory()],
  };
}

function newSkill(kind: "soft" | "hard"): SkillForm {
  return {
    id: null,
    kind,
    name: "",
    proficiency: "medium",
    experienceIds: [],
    storyIds: [],
  };
}

function newEducation(): EducationForm {
  return {
    id: null,
    institute: "",
    fromYear: null,
    toYear: null,
    fromMonth: null,
    toMonth: null,
    isCurrent: false,
    major: null,
    details: null,
  };
}

function newHobby(): HobbyForm {
  return {
    id: null,
    title: "",
    fromYear: null,
    toYear: null,
    isCurrent: false,
    details: null,
  };
}

function fromProfileData(data: ProfileData): ProfileForm {
  return {
    name: data.profile.name,
    birthday: data.profile.birthday,
    portfolioLink: data.profile.portfolioLink,
    email: data.profile.email,
    placeOfResidence: data.profile.placeOfResidence,
    phoneNumber: data.profile.phoneNumber,
    linkedinLink: data.profile.linkedinLink,
    otherSocialLinks: data.profile.otherSocialLinks,
    otherDetails: data.profile.otherDetails,
    characteristics: data.profile.characteristics,
    nextSteps: data.profile.nextSteps,
    profilePicture: data.profile.profilePicture,
    experiences: data.experiences.map((experience) => ({
      id: experience._id,
      employer: experience.employer,
      contractType: experience.contractType,
      isHobbyProject: experience.isHobbyProject,
      fromYear: experience.fromYear,
      toYear: experience.toYear,
      fromMonth: experience.fromMonth,
      toMonth: experience.toMonth,
      isCurrent: experience.isCurrent,
      stories: experience.stories.map((story) => ({
        id: story._id,
        projectName: story.projectName,
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
      })),
    })),
    skills: data.skills.map((skill) => ({
      id: skill._id,
      kind: skill.kind,
      name: skill.name,
      proficiency: skill.proficiency,
      experienceIds: skill.experienceIds,
      storyIds: skill.storyIds,
    })),
    educations: data.educations.map((education) => ({
      id: education._id,
      institute: education.institute,
      fromYear: education.fromYear,
      toYear: education.toYear,
      fromMonth: education.fromMonth,
      toMonth: education.toMonth,
      isCurrent: education.isCurrent,
      major: education.major,
      details: education.details,
    })),
    hobbies: data.hobbies.map((hobby) => ({
      id: hobby._id,
      title: hobby.title,
      fromYear: hobby.fromYear,
      toYear: hobby.toYear,
      isCurrent: hobby.isCurrent,
      details: hobby.details,
    })),
  };
}

function cleanString(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function normalizeForm(form: ProfileForm) {
  return {
    ...form,
    name: form.name.trim() || "Untitled Job Seeker",
    birthday: cleanString(form.birthday),
    portfolioLink: cleanString(form.portfolioLink),
    email: cleanString(form.email),
    placeOfResidence: cleanString(form.placeOfResidence),
    phoneNumber: cleanString(form.phoneNumber),
    linkedinLink: cleanString(form.linkedinLink),
    otherSocialLinks: form.otherSocialLinks
      .map((value) => value.trim())
      .filter(Boolean),
    otherDetails: cleanString(form.otherDetails),
    characteristics: form.characteristics
      .map((value) => value.trim())
      .filter(Boolean),
    nextSteps: form.nextSteps.map((value) => value.trim()).filter(Boolean),
    experiences: form.experiences.map((experience) => ({
      ...experience,
      employer: experience.employer.trim() || "Untitled experience",
      stories: experience.stories.map((story) => ({
        ...story,
        projectName: cleanString(story.projectName),
        situation: cleanString(story.situation),
        task: cleanString(story.task),
        action: cleanString(story.action),
        result: cleanString(story.result),
      })),
    })),
    skills: form.skills.map((skill) => ({
      ...skill,
      name: skill.name.trim() || "Untitled skill",
    })),
    educations: form.educations.map((education) => ({
      ...education,
      institute: education.institute.trim() || "Untitled education",
      major: cleanString(education.major),
      details: cleanString(education.details),
    })),
    hobbies: form.hobbies.map((hobby) => ({
      ...hobby,
      title: hobby.title.trim() || "Untitled hobby",
      details: cleanString(hobby.details),
    })),
  };
}
