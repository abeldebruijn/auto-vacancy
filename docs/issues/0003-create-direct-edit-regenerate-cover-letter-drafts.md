---
id: 0003
title: Create, direct, edit, and regenerate Cover Letter Drafts
type: AFK
status: ready-for-agent
blocked_by: ["0001", "0002"]
parent: docs/prds/cover-letter-drafts-and-examples.md
user_stories: [1, 2, 3, 4, 5, 6, 7, 8, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41]
---

## Parent

[Cover Letter Drafts and Examples PRD](../prds/cover-letter-drafts-and-examples.md)

## What to build

Let a Job Seeker create one active Cover Letter Draft in an Application Package. The draft is generated from the Candidate Profile, Vacancy Understanding, selected Cover Letter Examples, and package-specific Cover Letter Direction. The Job Seeker can edit, save, and regenerate the draft, with confirmation before regeneration overwrites saved edits.

Cover Letter Direction includes tone, addressee, length, focus, evidence style, opening style, and closing style. The addressee understood from the Vacancy remains separate from the addressee chosen in Cover Letter Direction, but can prefill the draft direction.

## Acceptance criteria

- [ ] A Job Seeker can create a Cover Letter Draft once an Application Package exists.
- [ ] Creating a Cover Letter Draft does not require an existing CV Draft.
- [ ] The draft generation uses Candidate Profile and Vacancy Understanding facts.
- [ ] Generation preserves Vacancy language when possible and avoids unsupported claims.
- [ ] The Job Seeker can explicitly select zero to five Cover Letter Examples for one draft.
- [ ] No Cover Letter Examples are selected by default.
- [ ] The Job Seeker can set and save tone, addressee, length, focus, evidence style, opening style, and closing style.
- [ ] Company-name addressee can be prefilled from the Vacancy Understanding when available.
- [ ] Person addressee supports open text.
- [ ] Anonymous addressee is supported.
- [ ] The Job Seeker can edit and save Cover Letter Draft text.
- [ ] The Application Package has at most one active Cover Letter Draft.
- [ ] Regeneration uses saved Cover Letter Direction and selected examples.
- [ ] Regeneration asks for confirmation before overwriting an existing draft.
- [ ] Generation and save failures are visible and recoverable.
- [ ] Tests cover independent draft creation, direction persistence, selected-example limits, zero-example generation, save behavior, and overwrite confirmation.

## Blocked by

- [0001 Prototype Cover Letter workspace placement](0001-prototype-cover-letter-workspace-placement.md)
- [0002 Manage global Cover Letter Examples](0002-manage-global-cover-letter-examples.md)
