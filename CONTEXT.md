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

## Relationships

- A **Job Seeker** owns one or more **Candidate Profiles**.
- A **Candidate Profile** contains Experiences, and an Experience may contain one or more **Experience Stories**.
- An **Imported CV** may be used to create a **Candidate Profile** when none exists.
- An **Imported CV** produces a **Replacement Preview** when applying it would replace an existing **Candidate Profile**.
- A **Replacement Preview** becomes the **Candidate Profile** only after Job Seeker approval.
- A **Vacancy Source** may be used to fill the **Vacancy** description before creating a **Vacancy Understanding**.
- A **Job Seeker** creates one **Vacancy Understanding** from one **Vacancy** before preparing an **Application Package**.
- A **Vacancy Understanding** may contain **Vacancy Questions** before or after the **Application Package** exists.
- A **Job Seeker** prepares one **Application Package** for a **Vacancy**.
- An **Application Package** is derived from exactly one **Vacancy** and one **Candidate Profile**.
- An **Application Package** may contain one active **CV Draft**.
- A **CV Draft** is a snapshot; later **Candidate Profile** changes do not rewrite it.
- A **CV Draft** may produce one or more **PDF Versions**.
- An **Application Package** contains a tailored **CV** and **Cover Letter**.
- An **Application Package** may inherit Candidate Profile facts while overriding package-specific presentation choices.
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
- A **PDF Version** is immutable; edits happen by changing the **CV Draft** and generating another version.
- An **Imported CV** is input source material, not the generated **CV**.
- A **Vacancy Source** describes a **Vacancy**; an **Imported CV** describes the Job Seeker's reusable facts.
- A **Replacement Preview** is not yet the **Candidate Profile**; it is a proposed replacement.
- A **Vacancy Understanding** is not yet an **Application Package**; it captures research and clarifications before generated materials exist.
- **Vacancy Questions** belong to the **Vacancy Understanding**; changing them can make an **Application Package** stale but does not directly edit the **CV Draft**.
- **Application Package** does not imply employer submission; submission is outside current scope.
- "Profile picture" on the **Candidate Profile** is the reusable default; a package picture is specific to one **Application Package**.
