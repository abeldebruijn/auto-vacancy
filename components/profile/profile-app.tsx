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
  Save,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  emptyProfile,
  fromProfileData,
  newEducation,
  newExperience,
  newHobby,
  newSkill,
  normalizeForm,
  removeAt,
  replaceAt,
  type ImportedCvItem,
  type ProfileData,
  type ProfileForm,
} from "@/lib/candidate-profile";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Field,
  ListField,
  Panel,
  SectionList,
  TextArea,
} from "@/components/profile/profile-form-fields";
import {
  EducationEditor,
  ExperienceEditor,
  HobbyEditor,
  SkillEditor,
} from "@/components/profile/profile-section-editors";
import { StartProfileScreen } from "@/components/profile/start-profile-screen";

export function ProfileApp() {
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
