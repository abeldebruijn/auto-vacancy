<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:local-issue-rules -->

# Local issue tracker

This project tracks agent-ready implementation issues as local markdown files in `docs/issues/`.

- Do not create GitHub issues unless the user explicitly asks for GitHub publication.
- New issue drafts should use sequential numeric filenames, for example `0004-short-title.md`.
- Each issue file must include YAML frontmatter with `id`, `title`, `type`, `status`, `blocked_by`, `parent`, and `user_stories`.
- Use `status: ready-for-agent` for approved AFK/HITL implementation slices unless the user says otherwise.
- Keep issue bodies in the local issue template: `Parent`, `What to build`, `Acceptance criteria`, and `Blocked by`.
- Track global issue progress in `docs/issues/0000-progess.md`; update it whenever issue work starts, finishes, or becomes unblocked.

<!-- END:local-issue-rules -->

<!-- BEGIN:vite-plus-rules -->

This project uses vite plus to manage node, dev and build commands

- vp env - Manage Node.js versions
- vp check - Run format, lint, and TypeScript type checks
- vp lint - Lint code
- vp fmt - Format code
- vp run test - Run tests
- vp run - Run monorepo tasks
- vp build - Build for production

do not run `vp build` instead run `vp run build`.

<!-- END:nextjs-agent-rules -->
