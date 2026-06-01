# Auto Vacancy

Auto Vacancy helps job seekers prepare vacancy-specific application materials from reusable candidate information.

## Language

**Job Seeker**:
A person using Auto Vacancy to prepare application materials.
_Avoid_: User, candidate

**Vacancy**:
An open job opportunity the Job Seeker wants to apply for.
_Avoid_: Job, opening, listing

**Vacancy Source**:
Source material supplied by a Job Seeker to describe one Vacancy.
_Avoid_: Imported Vacancy, Imported CV

**Vacancy Understanding**:
An intermediate interpretation of one Vacancy containing company identity, research, requirements, and Job Seeker answers before an Application Package exists.
_Avoid_: Application draft, workflow run

**Vacancy Questions**:
Clarification prompts and Job Seeker answers attached to one Vacancy Understanding.
_Avoid_: Application Package questions, CV Draft questions

**Pending Vacancy Question**:
A Vacancy Question that still needs a Job Seeker answer in the composer.
_Avoid_: Active prompt, current form question

**Answered Vacancy Question**:
A Vacancy Question with a Job Seeker answer that may be shown as a floating answer card.
_Avoid_: Saved card, note

**Candidate Profile**:
The reusable source of truth for a Job Seeker's experience, skills, education, and facts.
_Avoid_: Base CV, resume, profile

**Experience Story**:
A project-specific STAR story attached to an Experience in the Candidate Profile.
_Avoid_: Project, evidence story

**Imported CV**:
Source material uploaded by a Job Seeker and used to extract Candidate Profile facts.
_Avoid_: CV, generated CV

**Replacement Preview**:
Extracted Candidate Profile facts from an Imported CV that wait for Job Seeker approval before replacing the existing Candidate Profile.
_Avoid_: Draft profile, pending import

**Application Package**:
A persisted vacancy-specific workspace for generated materials and package-specific presentation choices.
_Avoid_: Application draft, tailored documents, submission

**CV Draft**:
Editable structured CV content inside one Application Package before PDF generation.
_Avoid_: JSON, generated CV, Candidate Profile

**CV**:
A generated document tailored to one Vacancy.
_Avoid_: Resume

**PDF Version**:
An immutable generated CV file created from a CV Draft at a point in time.
_Avoid_: Draft, latest CV

**Cover Letter**:
A generated letter tailored to one Vacancy.
_Avoid_: Motivation letter

**Cover Letter Draft**:
Editable cover letter content inside one Application Package before review or later export.
_Avoid_: Final letter, template

**Cover Letter Example**:
A past cover letter supplied by a Job Seeker as PDF or pasted text and reused as style guidance for future Cover Letters. Its text is the reusable source; the original file may be kept only as supporting material.
_Avoid_: Template, sample, previous letter

**Cover Letter Direction**:
Package-specific guidance for how a Cover Letter Draft should be written, including tone, addressee, length, focus, evidence style, opening style, and closing style.
_Avoid_: Prompt settings, generation config

**Cover Letter Review**:
HR-specialist critique attached to a specific Cover Letter Draft revision that evaluates the draft without directly rewriting it.
_Avoid_: Automatic edit, reviewer rewrite

**Application Material Rule**:
A reusable Job Seeker preference that guides how CV Drafts or Cover Letter Drafts should be written.
_Avoid_: Prompt, instruction, setting

## Relationships

- A **Job Seeker** owns one or more **Candidate Profiles**.
- A **Candidate Profile** contains Experiences, and an Experience may contain one or more **Experience Stories**.
- An **Imported CV** may be used to create a **Candidate Profile** when none exists.
- An **Imported CV** produces a **Replacement Preview** when applying it would replace an existing **Candidate Profile**.
- A **Replacement Preview** becomes the **Candidate Profile** only after Job Seeker approval.
- A **Vacancy Source** may be used to fill the **Vacancy** description before creating a **Vacancy Understanding**.
- A **Job Seeker** creates one **Vacancy Understanding** from one **Vacancy** before preparing an **Application Package**.
- A **Vacancy Understanding** may contain **Vacancy Questions** before or after the **Application Package** exists.
- A **Vacancy Question** is either a **Pending Vacancy Question** or an **Answered Vacancy Question**.
- An **Answered Vacancy Question** can be recalled for editing without becoming part of the **CV Draft** directly.
- A **Job Seeker** prepares one **Application Package** for a **Vacancy**.
- An **Application Package** is derived from exactly one **Vacancy** and one **Candidate Profile**.
- An **Application Package** may contain one active **CV Draft**.
- An **Application Package** may contain one active **Cover Letter Draft**.
- A **Cover Letter Draft** can be created without an existing **CV Draft**.
- A **CV Draft** is a snapshot; later **Candidate Profile** changes do not rewrite it.
- A **CV Draft** may produce one or more **PDF Versions**.
- A **Cover Letter Draft** follows the **Cover Letter Direction** chosen for its **Application Package**.
- A **Cover Letter Draft** may be based on zero to five explicitly selected **Cover Letter Examples**.
- A **Cover Letter Draft** may have one or more **Cover Letter Reviews**.
- **Cover Letter Direction** may use or override the addressee known by the **Vacancy Understanding**.
- An **Application Package** contains a tailored **CV** and **Cover Letter**.
- An **Application Package** may inherit Candidate Profile facts while overriding package-specific presentation choices.
- A **Job Seeker** may reuse **Cover Letter Examples** across multiple **Application Packages**.
- **Cover Letter Examples** are globally visible reusable material for the Job Seeker, even when added from one **Application Package** flow.
- A **Job Seeker** may define **Application Material Rules** for CV Drafts, Cover Letter Drafts, or both.
- Auto Vacancy prepares application materials; employer submission happens outside the system.

## Example dialogue

> **Dev:** "When a **Job Seeker** adds a **Vacancy**, should we update their **Candidate Profile**?"
> **Domain expert:** "No. The **Candidate Profile** stays reusable; the **Vacancy** is used to create a tailored **Application Package** with a **CV** and **Cover Letter**."
>
> **Dev:** "If a **Job Seeker** imports a new **Imported CV** after they already have a **Candidate Profile**, do we replace it immediately?"
> **Domain expert:** "No. We create a **Replacement Preview** first, then replace the **Candidate Profile** only after approval."

## Flagged ambiguities

- "Vacancy" means an open job opportunity, not a rental or occupancy slot.
- "User" is implementation language; use **Job Seeker** for the domain actor.
- A generated **CV** is an output, not the canonical source of the Job Seeker's facts.
- A **CV Draft** is editable generated content, not raw JSON exposed to the Job Seeker.
- A **Cover Letter Draft** is editable generated content, not a final submitted letter.
- An **Application Package** has at most one active **Cover Letter Draft**; regeneration replaces it after Job Seeker confirmation.
- The first Cover Letter workflow ends at editable **Cover Letter Draft** text; exporting a Cover Letter is later scope.
- **Cover Letter Direction** belongs to one **Application Package**; reusable preferences belong in **Application Material Rules**.
- The addressee on **Vacancy Understanding** is what Auto Vacancy understands from the Vacancy; the addressee in **Cover Letter Direction** is how the Job Seeker chooses to address one draft.
- **Cover Letter Examples** are selected explicitly for a **Cover Letter Draft**; they are not applied automatically, and the five-example limit applies to one draft's selection rather than the Job Seeker's stored examples.
- Managing **Cover Letter Examples** may happen globally or while preparing an **Application Package**, but both entry points use the same reusable examples.
- A **Cover Letter Review** critiques a **Cover Letter Draft**; the Job Seeker decides whether to change the draft.
- A **Cover Letter Review** remains tied to the draft revision it reviewed, even if the **Cover Letter Draft** changes later.
- A **PDF Version** is immutable; edits happen by changing the **CV Draft** and generating another version.
- An **Imported CV** is input source material, not the generated **CV**.
- A **Vacancy Source** describes a **Vacancy**; an **Imported CV** describes the Job Seeker's reusable facts.
- A **Replacement Preview** is not yet the **Candidate Profile**; it is a proposed replacement.
- A **Vacancy Understanding** is not yet an **Application Package**; it captures research and clarifications before generated materials exist.
- **Vacancy Questions** belong to the **Vacancy Understanding**; changing them can make an **Application Package** stale but does not directly edit the **CV Draft**.
- **Application Package** does not imply employer submission; submission is outside current scope.
- "Profile picture" on the **Candidate Profile** is the reusable default; a package picture is specific to one **Application Package**.
- A **Cover Letter Example** is reusable Job Seeker input, not part of one **Application Package**.
- An **Application Material Rule** is reusable Job Seeker guidance, not a one-off edit to a single **Application Package**.
