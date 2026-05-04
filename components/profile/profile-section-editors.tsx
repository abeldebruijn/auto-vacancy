"use client";

import { Trash2 } from "lucide-react";
import {
  Checks,
  Evidence,
  Field,
  FormSelect,
  IconButton,
  NumberField,
  SectionList,
  TextArea,
} from "@/components/profile/profile-form-fields";
import {
  newStory,
  removeAt,
  replaceAt,
  type EducationForm,
  type EvidenceOptions,
  type ExperienceForm,
  type HobbyForm,
  type SkillForm,
  type StoryForm,
} from "@/lib/candidate-profile";

export function ExperienceEditor({
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
              contractType: value === "" ? null : (value as "full-time" | "part-time"),
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
              removeAt(experience.stories, index, (stories) => onChange({ ...experience, stories }))
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

export function SkillEditor({
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
          onChange={(kind) => onChange({ ...skill, kind: kind as "soft" | "hard" })}
        />
        <Field label="Name" value={skill.name} onChange={(name) => onChange({ ...skill, name })} />
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

export function EducationEditor({
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
          ["Current", education.isCurrent, (isCurrent) => onChange({ ...education, isCurrent })],
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

export function HobbyEditor({
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
        values={[["Current", hobby.isCurrent, (isCurrent) => onChange({ ...hobby, isCurrent })]]}
      />
      <TextArea
        label="Details"
        value={hobby.details ?? ""}
        onChange={(details) => onChange({ ...hobby, details })}
      />
    </div>
  );
}
