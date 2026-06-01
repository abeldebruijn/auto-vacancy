---
id: 0002
title: Manage global Cover Letter Examples
type: AFK
status: ready-for-agent
blocked_by: []
parent: docs/prds/cover-letter-drafts-and-examples.md
user_stories: [12, 13, 14, 15, 16, 17, 18, 19, 42]
---

## Parent

[Cover Letter Drafts and Examples PRD](../prds/cover-letter-drafts-and-examples.md)

## What to build

Let a Job Seeker create and manage reusable Cover Letter Examples as globally visible material. A Job Seeker can add examples by pasting text or uploading a PDF, and both global and Application Package entry points operate on the same reusable examples.

The extracted text is the reusable source used later for generation. The original uploaded file may be retained only as supporting material. Cover Letter Examples must be private to the owning Job Seeker.

## Acceptance criteria

- [ ] A Job Seeker can create a Cover Letter Example from pasted text.
- [ ] A Job Seeker can create a Cover Letter Example by uploading a PDF and extracting reusable text.
- [ ] Cover Letter Examples are visible in a global management surface.
- [ ] A Cover Letter Example added from an Application Package flow appears in the same global list.
- [ ] A Job Seeker cannot read, update, select, or delete another Job Seeker's Cover Letter Examples.
- [ ] Upload and extraction failures are shown without leaking private filenames or file contents.
- [ ] Tests cover pasted text, PDF extraction, invalid or oversized files, and ownership behavior.

## Blocked by

None - can start immediately.
