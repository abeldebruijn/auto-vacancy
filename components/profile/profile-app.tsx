"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Authenticated,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronDown,
  GraduationCap,
  Heart,
  MoreHorizontal,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  emptyProfile,
  fromProfileData,
  isMarkdownCvFile,
  newEducation,
  newExperience,
  newHobby,
  newSkill,
  newStory,
  normalizeForm,
  removeAt,
  replaceAt,
  type EducationForm,
  type EvidenceOptions,
  type ExperienceForm,
  type HobbyForm,
  type ImportedCvItem,
  type ProfileData,
  type ProfileForm,
  type SkillForm,
  type StoryForm,
} from "@/lib/candidate-profile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Field,
  ListField,
  Panel,
  TextArea,
} from "@/components/profile/profile-form-fields";
import {
  EducationFormBody,
  ExperienceFormBody,
  HobbyFormBody,
  SkillFormBody,
  StoryFormBody,
} from "@/components/profile/profile-section-editors";
import { AppHeader } from "@/components/profile/app-header";

export function ProfileApp() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <AppHeader logoHref="/" />
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

function ImportedCvHistory({
  importedCvs,
  onApplyPreview,
}: {
  importedCvs: ImportedCvItem[];
  onApplyPreview: (importedCvId: Id<"importedCvs">) => Promise<void>;
}) {
  if (importedCvs.length === 0) return null;

  const [latest, ...older] = importedCvs;

  return (
    <div className="mt-4 space-y-2">
      <ImportedCvRow item={latest} onApplyPreview={onApplyPreview} />
      {older.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className="size-3.5" />+{older.length} others before
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {older.map((item) => (
              <ImportedCvRow
                key={item._id}
                item={item}
                onApplyPreview={onApplyPreview}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function ImportedCvRow({
  item,
  onApplyPreview,
}: {
  item: ImportedCvItem;
  onApplyPreview: (importedCvId: Id<"importedCvs">) => Promise<void>;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{item.filename}</span>
        <Badge variant={item.status === "failed" ? "destructive" : "secondary"}>
          {item.status}
        </Badge>
      </div>
      {item.status === "preview" && (
        <Button
          className="mt-2 w-full"
          size="sm"
          variant="outline"
          onClick={() => void onApplyPreview(item._id)}
        >
          <Check className="size-3.5" />
          Apply preview
        </Button>
      )}
    </div>
  );
}

function ExperienceTable({
  experiences,
  onChange,
}: {
  experiences: ExperienceForm[];
  onChange: (experiences: ExperienceForm[]) => void;
}) {
  const [editingExperience, setEditingExperience] = useState<number | null>(
    null,
  );
  const [editingStory, setEditingStory] = useState<{
    experienceIndex: number;
    storyIndex: number;
  } | null>(null);
  const [deletingExperience, setDeletingExperience] = useState<number | null>(
    null,
  );
  const [deletingStory, setDeletingStory] = useState<{
    experienceIndex: number;
    storyIndex: number;
  } | null>(null);

  function updateExperience(index: number, next: ExperienceForm) {
    replaceAt(experiences, index, next, onChange);
  }

  function updateStory(
    experienceIndex: number,
    storyIndex: number,
    next: StoryForm,
  ) {
    const experience = experiences[experienceIndex];
    if (!experience) return;
    replaceAt(experience.stories, storyIndex, next, (stories) =>
      updateExperience(experienceIndex, { ...experience, stories }),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onChange([...experiences, newExperience()]);
            setEditingExperience(experiences.length);
          }}
        >
          <Plus className="size-3.5" />
          Add experience
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employer</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Hobby</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiences.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No experiences yet.
              </TableCell>
            </TableRow>
          ) : (
            experiences.map((experience, experienceIndex) => (
              <Fragment key={`experience-group-${experienceIndex}`}>
                <TableRow key={`experience-${experienceIndex}`}>
                  <TableCell className="font-medium">
                    {experience.employer || "Untitled experience"}
                  </TableCell>
                  <TableCell>{formatExperiencePeriod(experience)}</TableCell>
                  <TableCell>
                    {experience.isHobbyProject ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label="Experience actions"
                        render={<Button size="icon-sm" variant="ghost" />}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => setEditingExperience(experienceIndex)}
                        >
                          Edit experience
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            updateExperience(experienceIndex, {
                              ...experience,
                              stories: [...experience.stories, newStory()],
                            });
                            setEditingStory({
                              experienceIndex,
                              storyIndex: experience.stories.length,
                            });
                          }}
                        >
                          Add story
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingExperience(experienceIndex)}
                        >
                          Delete experience
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {experience.stories.map((story, storyIndex) => (
                  <TableRow
                    key={`story-${experienceIndex}-${storyIndex}`}
                    className="bg-muted/20"
                  >
                    <TableCell
                      className="pl-8 text-muted-foreground"
                      colSpan={3}
                    >
                      {story.projectName || "Untitled story"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label="Experience Story actions"
                          render={<Button size="icon-sm" variant="ghost" />}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() =>
                              setEditingStory({ experienceIndex, storyIndex })
                            }
                          >
                            Edit story
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              setDeletingStory({ experienceIndex, storyIndex })
                            }
                          >
                            Delete story
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>

      {editingExperience !== null && experiences[editingExperience] && (
        <Dialog
          open
          onOpenChange={(open) => !open && setEditingExperience(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit experience</DialogTitle>
            </DialogHeader>
            <ExperienceFormBody
              experience={experiences[editingExperience]}
              onChange={(next) => updateExperience(editingExperience, next)}
            />
            <DialogFooter>
              <Button onClick={() => setEditingExperience(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editingStory !== null &&
        experiences[editingStory.experienceIndex]?.stories[
          editingStory.storyIndex
        ] && (
          <Dialog open onOpenChange={(open) => !open && setEditingStory(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Experience Story</DialogTitle>
              </DialogHeader>
              <StoryFormBody
                story={
                  experiences[editingStory.experienceIndex].stories[
                    editingStory.storyIndex
                  ]
                }
                onChange={(next) =>
                  updateStory(
                    editingStory.experienceIndex,
                    editingStory.storyIndex,
                    next,
                  )
                }
              />
              <DialogFooter>
                <Button onClick={() => setEditingStory(null)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      <AlertDialog
        open={deletingExperience !== null}
        onOpenChange={(open) => !open && setDeletingExperience(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete experience?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the experience and its Experience Stories from the
              Candidate Profile draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonDangerClass}
              onClick={() => {
                if (deletingExperience !== null) {
                  removeAt(experiences, deletingExperience, onChange);
                }
                setDeletingExperience(null);
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deletingStory !== null}
        onOpenChange={(open) => !open && setDeletingStory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experience Story?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the Experience Story from the Candidate Profile
              draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonDangerClass}
              onClick={() => {
                if (deletingStory !== null) {
                  const experience = experiences[deletingStory.experienceIndex];
                  if (experience) {
                    removeAt(
                      experience.stories,
                      deletingStory.storyIndex,
                      (stories) =>
                        updateExperience(deletingStory.experienceIndex, {
                          ...experience,
                          stories,
                        }),
                    );
                  }
                }
                setDeletingStory(null);
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const buttonDangerClass =
  "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20";

function formatExperiencePeriod(experience: ExperienceForm) {
  const from = formatYearMonth(experience.fromYear, experience.fromMonth);
  const to = experience.isCurrent
    ? "Current"
    : formatYearMonth(experience.toYear, experience.toMonth);

  if (from && to) return `${from} - ${to}`;
  if (from) return `${from} -`;
  if (to) return to;
  return "Not set";
}

function formatYearMonth(year: number | null, month: number | null) {
  if (year === null) return null;
  if (month === null) return year.toString();
  return `${year}-${month.toString().padStart(2, "0")}`;
}

function SkillTable({
  skills,
  evidenceOptions,
  onChange,
}: {
  skills: SkillForm[];
  evidenceOptions: EvidenceOptions;
  onChange: (skills: SkillForm[]) => void;
}) {
  const [editingSkill, setEditingSkill] = useState<number | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<number | null>(null);

  function updateSkill(index: number, next: SkillForm) {
    replaceAt(skills, index, next, onChange);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onChange([...skills, newSkill("hard")]);
            setEditingSkill(skills.length);
          }}
        >
          <Plus className="size-3.5" />
          Add skill
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Proficiency</TableHead>
            <TableHead>Evidence</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.length === 0 ? (
            <EmptyTableRow colSpan={5}>No skills yet.</EmptyTableRow>
          ) : (
            skills.map((skill, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {skill.name || "Untitled skill"}
                </TableCell>
                <TableCell>{skill.kind}</TableCell>
                <TableCell>{skill.proficiency}</TableCell>
                <TableCell>
                  {formatSkillEvidence(skill, evidenceOptions)}
                </TableCell>
                <TableCell className="text-right">
                  <RowActions
                    label="Skill actions"
                    editLabel="Edit skill"
                    deleteLabel="Delete skill"
                    onEdit={() => setEditingSkill(index)}
                    onDelete={() => setDeletingSkill(index)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {editingSkill !== null && skills[editingSkill] && (
        <Dialog open onOpenChange={(open) => !open && setEditingSkill(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit skill</DialogTitle>
            </DialogHeader>
            <SkillFormBody
              skill={skills[editingSkill]}
              evidenceOptions={evidenceOptions}
              onChange={(next) => updateSkill(editingSkill, next)}
            />
            <DialogFooter>
              <Button onClick={() => setEditingSkill(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <DeleteDialog
        open={deletingSkill !== null}
        title="Delete skill?"
        description="This removes the skill from the Candidate Profile draft."
        onOpenChange={(open) => !open && setDeletingSkill(null)}
        onConfirm={() => {
          if (deletingSkill !== null) removeAt(skills, deletingSkill, onChange);
          setDeletingSkill(null);
        }}
      />
    </div>
  );
}

function EducationTable({
  educations,
  onChange,
}: {
  educations: EducationForm[];
  onChange: (educations: EducationForm[]) => void;
}) {
  const [editingEducation, setEditingEducation] = useState<number | null>(null);
  const [deletingEducation, setDeletingEducation] = useState<number | null>(
    null,
  );

  function updateEducation(index: number, next: EducationForm) {
    replaceAt(educations, index, next, onChange);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onChange([...educations, newEducation()]);
            setEditingEducation(educations.length);
          }}
        >
          <Plus className="size-3.5" />
          Add education
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Institute</TableHead>
            <TableHead>Major</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {educations.length === 0 ? (
            <EmptyTableRow colSpan={4}>No education yet.</EmptyTableRow>
          ) : (
            educations.map((education, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {education.institute || "Untitled education"}
                </TableCell>
                <TableCell>
                  {education.major || (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell>{formatEducationPeriod(education)}</TableCell>
                <TableCell className="text-right">
                  <RowActions
                    label="Education actions"
                    editLabel="Edit education"
                    deleteLabel="Delete education"
                    onEdit={() => setEditingEducation(index)}
                    onDelete={() => setDeletingEducation(index)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {editingEducation !== null && educations[editingEducation] && (
        <Dialog
          open
          onOpenChange={(open) => !open && setEditingEducation(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit education</DialogTitle>
            </DialogHeader>
            <EducationFormBody
              education={educations[editingEducation]}
              onChange={(next) => updateEducation(editingEducation, next)}
            />
            <DialogFooter>
              <Button onClick={() => setEditingEducation(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <DeleteDialog
        open={deletingEducation !== null}
        title="Delete education?"
        description="This removes the education from the Candidate Profile draft."
        onOpenChange={(open) => !open && setDeletingEducation(null)}
        onConfirm={() => {
          if (deletingEducation !== null)
            removeAt(educations, deletingEducation, onChange);
          setDeletingEducation(null);
        }}
      />
    </div>
  );
}

function HobbyTable({
  hobbies,
  onChange,
}: {
  hobbies: HobbyForm[];
  onChange: (hobbies: HobbyForm[]) => void;
}) {
  const [editingHobby, setEditingHobby] = useState<number | null>(null);
  const [deletingHobby, setDeletingHobby] = useState<number | null>(null);

  function updateHobby(index: number, next: HobbyForm) {
    replaceAt(hobbies, index, next, onChange);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onChange([...hobbies, newHobby()]);
            setEditingHobby(hobbies.length);
          }}
        >
          <Plus className="size-3.5" />
          Add hobby
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hobbies.length === 0 ? (
            <EmptyTableRow colSpan={4}>No hobbies yet.</EmptyTableRow>
          ) : (
            hobbies.map((hobby, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {hobby.title || "Untitled hobby"}
                </TableCell>
                <TableCell>{formatHobbyPeriod(hobby)}</TableCell>
                <TableCell className="max-w-[28rem] truncate">
                  {hobby.details || (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <RowActions
                    label="Hobby actions"
                    editLabel="Edit hobby"
                    deleteLabel="Delete hobby"
                    onEdit={() => setEditingHobby(index)}
                    onDelete={() => setDeletingHobby(index)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {editingHobby !== null && hobbies[editingHobby] && (
        <Dialog open onOpenChange={(open) => !open && setEditingHobby(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit hobby</DialogTitle>
            </DialogHeader>
            <HobbyFormBody
              hobby={hobbies[editingHobby]}
              onChange={(next) => updateHobby(editingHobby, next)}
            />
            <DialogFooter>
              <Button onClick={() => setEditingHobby(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <DeleteDialog
        open={deletingHobby !== null}
        title="Delete hobby?"
        description="This removes the hobby from the Candidate Profile draft."
        onOpenChange={(open) => !open && setDeletingHobby(null)}
        onConfirm={() => {
          if (deletingHobby !== null)
            removeAt(hobbies, deletingHobby, onChange);
          setDeletingHobby(null);
        }}
      />
    </div>
  );
}

function RowActions({
  label,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: {
  label: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        render={<Button size="icon-sm" variant="ghost" />}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onEdit}>{editLabel}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteDialog({
  open,
  title,
  description,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className={buttonDangerClass} onClick={onConfirm}>
            <Trash2 className="size-3.5" />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EmptyTableRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

function formatSkillEvidence(
  skill: SkillForm,
  evidenceOptions: EvidenceOptions,
) {
  const experienceLabels = evidenceOptions.experiences
    .filter((option) => skill.experienceIds.includes(option.id))
    .map((option) => option.label);
  const storyLabels = evidenceOptions.stories
    .filter((option) => skill.storyIds.includes(option.id))
    .map((option) => option.label);
  const labels = [...experienceLabels, ...storyLabels].filter(Boolean);

  if (labels.length === 0)
    return <span className="text-muted-foreground">None</span>;
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function formatEducationPeriod(education: EducationForm) {
  const from = formatYearMonth(education.fromYear, education.fromMonth);
  const to = education.isCurrent
    ? "Current"
    : formatYearMonth(education.toYear, education.toMonth);

  if (from && to) return `${from} - ${to}`;
  if (from) return `${from} -`;
  if (to) return to;
  return "Not set";
}

function formatHobbyPeriod(hobby: HobbyForm) {
  const from = hobby.fromYear?.toString() ?? null;
  const to = hobby.isCurrent ? "Current" : (hobby.toYear?.toString() ?? null);

  if (from && to) return `${from} - ${to}`;
  if (from) return `${from} -`;
  if (to) return to;
  return "Not set";
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

  useEffect(() => {
    if (profileData === undefined) return;
    if (profileData === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(emptyProfile);
      return;
    }
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

  async function handleSave() {
    try {
      setStatus("Saving Candidate Profile...");
      await saveProfile({ profile: normalizeForm(form) });
      setStatus("Candidate Profile saved.");
    } catch {
      setStatus("Failed to save profile. Please try again.");
    }
  }

  async function handlePictureUpload(file: File) {
    setStatus("Uploading profile picture...");
    try {
      const url = await uploadUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      await setPicture({ profilePicture: { kind: "storage", storageId } });
      setForm((current) => ({
        ...current,
        profilePicture: { kind: "storage", storageId },
      }));
      setStatus("Profile picture saved.");
    } catch {
      setStatus("Failed to upload picture. Please try again.");
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
          <ImportedCvHistory
            importedCvs={importedCvs as ImportedCvItem[]}
            onApplyPreview={async (importedCvId) => {
              try {
                setStatus("Applying replacement preview...");
                await applyPreview({ importedCvId });
                setStatus("Replacement applied.");
              } catch {
                setStatus("Failed to apply preview. Please try again.");
              }
            }}
          />
        </Panel>

        <Panel title="Profile Picture" icon={<Camera className="size-4" />}>
          <div className="flex items-center gap-3">
            <Avatar
              className="size-16 rounded-lg border border-neutral-200"
              size="lg"
            >
              {profileData?.pictureUrl ? (
                <AvatarImage
                  className="rounded-lg"
                  src={profileData.pictureUrl}
                  alt=""
                />
              ) : (
                <AvatarFallback className="rounded-lg bg-neutral-50">
                  <UserRound className="size-6" />
                </AvatarFallback>
              )}
            </Avatar>
            <label className="text-sm">
              <span className="inline-flex h-8 cursor-pointer items-center rounded-md border border-neutral-200 bg-background px-3 text-sm font-medium hover:bg-muted">
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
          <ExperienceTable
            experiences={form.experiences}
            onChange={(experiences) => setForm({ ...form, experiences })}
          />
        </Panel>

        <Panel title="Skills" icon={<Sparkles className="size-4" />}>
          <SkillTable
            skills={form.skills}
            evidenceOptions={evidenceOptions}
            onChange={(skills) => setForm({ ...form, skills })}
          />
        </Panel>

        <Panel title="Education" icon={<GraduationCap className="size-4" />}>
          <EducationTable
            educations={form.educations}
            onChange={(educations) => setForm({ ...form, educations })}
          />
        </Panel>

        <Panel title="Hobbies" icon={<Heart className="size-4" />}>
          <HobbyTable
            hobbies={form.hobbies}
            onChange={(hobbies) => setForm({ ...form, hobbies })}
          />
        </Panel>
      </section>
    </main>
  );
}
