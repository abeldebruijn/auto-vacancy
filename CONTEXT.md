# Auto Vacancy

Auto Vacancy helps job seekers prepare vacancy-specific application materials from reusable candidate information.

## Language

**Job Seeker**:
A person using Auto Vacancy to prepare application materials.
_Avoid_: User, candidate

**Vacancy**:
An open job opportunity the Job Seeker wants to apply for.
_Avoid_: Job, opening, listing

**Candidate Profile**:
The reusable source of truth for a Job Seeker's experience, skills, education, and facts.
_Avoid_: Base CV, resume, profile

**Imported CV**:
Source material uploaded by a Job Seeker and used to extract Candidate Profile facts.
_Avoid_: CV, generated CV

**Application Package**:
A vacancy-specific set of generated materials prepared from a Vacancy and Candidate Profile.
_Avoid_: Application draft, tailored documents, submission

**CV**:
A generated document tailored to one Vacancy.
_Avoid_: Resume

**Cover Letter**:
A generated letter tailored to one Vacancy.
_Avoid_: Motivation letter

## Relationships

- A **Job Seeker** owns one or more **Candidate Profiles**.
- An **Imported CV** may be used to create or replace a **Candidate Profile**.
- A **Job Seeker** prepares one **Application Package** for a **Vacancy**.
- An **Application Package** is derived from exactly one **Vacancy** and one **Candidate Profile**.
- An **Application Package** contains a tailored **CV** and **Cover Letter**.
- Auto Vacancy prepares application materials; employer submission happens outside the system.

## Example dialogue

> **Dev:** "When a **Job Seeker** adds a **Vacancy**, should we update their **Candidate Profile**?"
> **Domain expert:** "No. The **Candidate Profile** stays reusable; the **Vacancy** is used to create a tailored **Application Package** with a **CV** and **Cover Letter**."

## Flagged ambiguities

- "Vacancy" means an open job opportunity, not a rental or occupancy slot.
- "User" is implementation language; use **Job Seeker** for the domain actor.
- A generated **CV** is an output, not the canonical source of the Job Seeker's facts.
- An **Imported CV** is input source material, not the generated **CV**.
- **Application Package** does not imply employer submission; submission is outside current scope.
