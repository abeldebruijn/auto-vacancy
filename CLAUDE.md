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

<!-- BEGIN:vite-plus-rules -->

This project uses vite plus to manage node, dev and build commands

- vp env - Manage Node.js versions
- vp check - Run format, lint, and TypeScript type checks
- vp lint - Lint code
- vp fmt - Format code
- vp test - Run tests
- vp run - Run monorepo tasks
- vp build - Build for production

do not run `vp build` instead run `vp run build`.

<!-- END:nextjs-agent-rules -->
