## Problem Statement

Job Seekers can currently prepare a personalised CV for a Vacancy, but they cannot yet create an editable Cover Letter in the same Application Package. A strong Cover Letter should reuse the Job Seeker's Candidate Profile, Vacancy Understanding, and prior writing style, while still giving the Job Seeker control over tone, addressee, and final wording.

Job Seekers also need a place to reuse past Cover Letters as style guidance across future Vacancies. Those examples should be globally visible reusable material, not hidden inside one Application Package. In a later version, Job Seekers should also be able to define reusable Application Material Rules and request HR-specialist critique without surrendering control of the draft.

## Solution

Add a Cover Letter workflow to Application Packages. A Job Seeker can manage global Cover Letter Examples by uploading PDFs or pasting text, select zero to five examples for one Cover Letter Draft, choose Cover Letter Direction, generate an editable Cover Letter Draft, edit it, save it, and regenerate it after confirmation.

The first version ends at editable Cover Letter Draft text. Cover Letter PDF export, DOCX import, automatic submission, Application Material Rules, and Cover Letter Reviews are out of scope for the first implementation, but the design should not block them.

## User Stories

1. As a Job Seeker, I want to create a Cover Letter Draft for an Application Package, so that I can prepare a complete application next to my CV.
2. As a Job Seeker, I want the Cover Letter Draft to use the Vacancy Understanding, so that it is tailored to the company, role, language, requirements, and answers already captured.
3. As a Job Seeker, I want the Cover Letter Draft to use my Candidate Profile, so that it reflects my real experience, skills, education, and facts.
4. As a Job Seeker, I want to edit the Cover Letter Draft after generation, so that the final wording remains mine.
5. As a Job Seeker, I want to save edits to the Cover Letter Draft, so that I can return later without losing changes.
6. As a Job Seeker, I want to regenerate the Cover Letter Draft only after confirmation, so that saved edits are not overwritten accidentally.
7. As a Job Seeker, I want one active Cover Letter Draft per Application Package, so that I do not have to choose between competing drafts in the first version.
8. As a Job Seeker, I want to create a Cover Letter Draft without needing a CV Draft first, so that I can work in the order that fits the application.
9. As a Job Seeker, I want the Cover Letter step to be available once the Application Package exists, so that I am not blocked by CV export.
10. As a Job Seeker, I want the Cover Letter step to appear after the CV workspace for now, so that the common flow still feels like CV first, Cover Letter second.
11. As a Job Seeker, I want that placement to be treated as provisional, so that it can change after prototyping.
12. As a Job Seeker, I want to upload past Cover Letters as PDFs, so that I can reuse existing application material.
13. As a Job Seeker, I want to paste past Cover Letter text, so that I can reuse letters from email, documents, or other tools without making a file.
14. As a Job Seeker, I want Cover Letter Example text to be extracted and stored, so that generation can use the actual writing content.
15. As a Job Seeker, I want the original uploaded file to be optional supporting material, so that the reusable source is the text and not the file itself.
16. As a Job Seeker, I want all Cover Letter Examples to be globally visible, so that examples uploaded during one application can be reused for another Vacancy.
17. As a Job Seeker, I want to manage Cover Letter Examples from a global area, so that I can maintain my reusable writing material outside one application.
18. As a Job Seeker, I want to add or select Cover Letter Examples while preparing an Application Package, so that I do not have to leave the Cover Letter flow.
19. As a Job Seeker, I want both entry points to use the same reusable Cover Letter Examples, so that I do not create duplicates by accident.
20. As a Job Seeker, I want to explicitly select which Cover Letter Examples are used for a draft, so that old style choices are not applied unexpectedly.
21. As a Job Seeker, I want no Cover Letter Examples selected by default, so that every draft starts from an intentional choice.
22. As a Job Seeker, I want to select zero Cover Letter Examples, so that I can create a Cover Letter Draft even without past material.
23. As a Job Seeker, I want to select up to five Cover Letter Examples for one Cover Letter Draft, so that the model has enough style guidance without overloading the prompt.
24. As a Job Seeker, I want the five-example limit to apply to one draft selection, not my stored examples, so that my reusable library can grow later.
25. As a Job Seeker, I want to choose a tone such as direct or formal, so that the Cover Letter Draft matches the application context.
26. As a Job Seeker, I want to choose the addressee mode, so that I can address the company, a specific person, or remain anonymous.
27. As a Job Seeker, I want the company-name addressee field to be prefilled when Auto Vacancy already knows the company, so that I do not retype known information.
28. As a Job Seeker, I want a free text field for a person addressee, so that I can address a recruiter or hiring manager directly.
29. As a Job Seeker, I want an anonymous addressee option, so that I can avoid naming an unknown person or company contact.
30. As a Job Seeker, I want to choose length, so that the draft can be short, standard, or detailed.
31. As a Job Seeker, I want to choose focus, so that the draft can emphasize motivation, experience, skills, culture fit, or a career switch.
32. As a Job Seeker, I want to choose evidence style, so that the draft can be story-led, achievement-led, or concise proof.
33. As a Job Seeker, I want to choose opening style, so that the first paragraph matches my preferred approach.
34. As a Job Seeker, I want to choose closing style, so that the ending is confident, enthusiastic, or understated.
35. As a Job Seeker, I want Cover Letter Direction to be saved with the Application Package, so that regenerating uses the same choices.
36. As a Job Seeker, I want Cover Letter Direction to be separate from reusable Application Material Rules, so that per-application choices do not become global preferences.
37. As a Job Seeker, I want the Vacancy Understanding addressee to remain what Auto Vacancy knows from the Vacancy, so that understood data stays distinct from my drafting choice.
38. As a Job Seeker, I want Cover Letter Direction to use or override the understood addressee, so that I can choose how this particular draft is addressed.
39. As a Job Seeker, I want the Cover Letter Draft generation to preserve the Vacancy language when possible, so that the letter matches the employer's context.
40. As a Job Seeker, I want generated Cover Letters to use only supported facts, so that I do not accidentally claim experience I do not have.
41. As a Job Seeker, I want generation failures to be visible and recoverable, so that I know when the draft was not created.
42. As a Job Seeker, I want Cover Letter Examples to be private to me, so that my past applications are not exposed to other Job Seekers.
43. As a Job Seeker, I want Application Material Rules to be possible later for CV Drafts, Cover Letter Drafts, or both, so that reusable preferences can guide future generation.
44. As a Job Seeker, I want a later rule such as "always start Cover Letters with Dear Sir/Madam", so that repeated writing preferences do not have to be re-entered.
45. As a Job Seeker, I want future HR-specialist critique to be separate from the Cover Letter Draft, so that feedback does not rewrite my work automatically.
46. As a Job Seeker, I want future Cover Letter Reviews to stay tied to the draft revision reviewed, so that critique remains historically accurate after edits.
47. As a Job Seeker, I want to decide whether to apply future review feedback, so that I remain responsible for the final draft.

## Implementation Decisions

- Build the first workflow around editable Cover Letter Draft text inside an Application Package.
- Do not make Cover Letter Draft creation depend on an existing CV Draft.
- Keep one active Cover Letter Draft per Application Package. Regeneration overwrites the draft only after Job Seeker confirmation.
- Do not include Cover Letter PDF export in the first version.
- Store Cover Letter Examples as reusable Job Seeker material, globally visible to that Job Seeker across Application Packages.
- Support two first-version Cover Letter Example input paths: PDF upload and pasted text.
- Treat extracted example text as the source used for generation. Original uploaded files may be retained only as supporting material.
- Allow Cover Letter Examples to be managed globally and from the Application Package flow. Both entry points operate on the same reusable examples.
- Require explicit Cover Letter Example selection for generation. No examples are selected by default.
- Limit one Cover Letter Draft generation request to zero to five selected Cover Letter Examples.
- Add package-specific Cover Letter Direction with tone, addressee, length, focus, evidence style, opening style, and closing style.
- Keep the addressee understood from the Vacancy separate from the addressee chosen in Cover Letter Direction. The understood addressee can prefill the direction, but direction owns the Job Seeker's draft choice.
- Design the backend boundary with Convex validators for all new public and internal functions.
- Use authenticated owner checks derived server-side from the current identity for all Cover Letter Example, Direction, Draft, and future Review access.
- Add a deep Cover Letter generation module that accepts Candidate Profile data, Vacancy Understanding detail, selected Cover Letter Examples, Cover Letter Direction, and later Application Material Rules through a stable interface.
- Add a deep Cover Letter Example extraction module that turns supported inputs into clean reusable text through a stable interface.
- Extend the Application Package detail API to include Cover Letter Draft and Cover Letter Direction data needed by the client.
- Add mutations for saving Cover Letter Direction, saving Cover Letter Draft edits, creating Cover Letter Examples from pasted text, and deleting or updating examples if supported by the first UI.
- Add actions for generating and regenerating Cover Letter Drafts, using the existing AI SDK pattern.
- Add a markdown extraction route for Cover Letter Example PDFs, following the existing PDF-to-markdown behavior used by other import flows.
- Treat the Cover Letter step placement as provisional until prototyping. Current assumption: available once the Application Package exists and shown after the CV workspace.
- Preserve future extension points for Application Material Rules and Cover Letter Reviews without implementing them in the first version.
- Respect ADR-0004: Cover Letter Direction addressee choice remains separate from Vacancy Understanding addressee.
- Respect ADR-0005: future Cover Letter Reviews attach to exact Cover Letter Draft revisions and do not directly rewrite drafts.

## Testing Decisions

- Tests should cover external behavior and domain boundaries, not internal implementation details.
- Cover Letter Example extraction should be tested with successful PDF extraction, pasted text, oversize or invalid file behavior, and error messages that do not leak private filenames or contents.
- Cover Letter Example ownership should be tested so one Job Seeker cannot read, select, update, or delete another Job Seeker's examples.
- Cover Letter Direction saving should be tested for addressee modes, prefilled company-name behavior, and persistence across regeneration.
- Cover Letter Draft generation should be tested for the selected-example limit, zero-example generation, supported-fact constraints, and overwrite behavior.
- Cover Letter Draft editing should be tested for saving edits and preserving them across reload.
- Regeneration should be tested at the UI boundary to ensure confirmation is required before overwriting an existing draft.
- Application Package detail behavior should be tested to ensure CV Draft and Cover Letter Draft can exist independently.
- UI tests should follow the existing Application Package test style: render the Vacancy detail experience with mocked Convex hooks and assert user-visible behavior.
- API route tests should follow the existing PDF markdown route tests: validate content type handling, size limits, conversion success, and sanitized failures.
- Convex function tests should focus on authenticated behavior, validation, ownership, and returned state shape.
- AI generation should be wrapped so deterministic tests can verify prompt inputs and output normalization without depending on live model calls.

## Out of Scope

- Cover Letter PDF export.
- DOCX import for Cover Letter Examples.
- Multiple side-by-side Cover Letter Draft alternatives.
- Automatic selection of Cover Letter Examples.
- Employer submission from Auto Vacancy.
- Implementing Application Material Rules.
- Implementing Cover Letter Reviews.
- Applying HR-specialist feedback automatically.
- Letting Cover Letter Reviews mutate Cover Letter Drafts directly.
- Finalizing the exact Cover Letter step placement before prototyping.

## Further Notes

- Use the project glossary terms: Job Seeker, Vacancy, Vacancy Understanding, Candidate Profile, Application Package, CV Draft, Cover Letter Draft, Cover Letter Example, Cover Letter Direction, Cover Letter Review, and Application Material Rule.
- Avoid "user", "resume", "template", and "prompt settings" in product copy and domain docs unless discussing implementation internals.
- The Mermaid flow discussed in planning shows the intended process: Candidate Profile and Vacancy Understanding feed Application Package creation; CV Draft and Cover Letter Draft are sibling materials; Cover Letter Examples and Cover Letter Direction guide Cover Letter Draft generation; future Cover Letter Reviews critique a specific draft revision. See chart (./cv-and-cover-letter-process.md)
