# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # First-time setup: install deps, Prisma generate, db migrate
npm run dev            # Start dev server (Turbopack)
npm run build          # Production build
npm run lint           # ESLint
npm test               # Vitest (all tests)
npm test -- --watch    # Vitest watch mode
npm run db:reset       # Reset SQLite database (destructive)
```

## Architecture Overview

**UIGen** is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates code into a virtual (in-memory) file system, which is then Babel-transformed and rendered in an iframe.

### Data flow

1. User message → `ChatProvider` (`src/lib/contexts/chat-context.tsx`) via Vercel AI SDK `useChat`
2. `POST /api/chat` (`src/app/api/chat/route.ts`) streams Claude responses with tool access
3. Claude calls `str_replace_editor` / `file_manager` tools → `FileSystemProvider` updates in real time
4. `PreviewFrame` reads virtual FS, transforms JSX with Babel standalone, renders in iframe

### Virtual File System

`src/lib/file-system.ts` is a Map-based in-memory tree — no disk writes. It is serialized to JSON for database storage (Prisma/SQLite) and sent as context in every chat API request. Only authenticated users get persistence; anonymous work lives in localStorage metadata only.

### AI / Tool Calling

- **Vercel AI SDK** (`streamText`) on the server; `useChat` on the client
- Claude's tools are defined in `/api/chat/route.ts` and implemented in `src/lib/tools/`
- System prompt with Anthropic ephemeral cache is in `src/lib/prompts/generation.tsx`
- **Mock fallback**: `MockLanguageModel` in `src/lib/provider.ts` returns canned components when `ANTHROPIC_API_KEY` is absent

### Authentication

JWT session cookies via `jose` (`src/lib/auth.ts`). `getSession()` on server actions/routes. `useAuth` hook for client components. 7-day expiry.

### State Management

React Context only — no external state library. `ChatProvider` owns messages/input; `FileSystemProvider` owns the virtual FS tree.

### Key directories

| Path | Purpose |
|------|---------|
| `src/app/api/chat/` | Chat streaming endpoint + tool definitions |
| `src/lib/file-system.ts` | Core virtual FS |
| `src/lib/tools/` | `str_replace_editor` and `file_manager` tool implementations |
| `src/lib/prompts/` | Claude system prompt |
| `src/lib/provider.ts` | Model provider selection + MockLanguageModel |
| `src/lib/contexts/` | Chat and FileSystem React contexts |
| `src/lib/transform/` | Babel JSX transformer for preview |
| `src/actions/` | Next.js server actions (project CRUD) |
| `src/components/preview/` | Iframe-based preview component |
| `prisma/schema.prisma` | **Source of truth for DB structure** — read this to understand any data stored in the database |

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Optional; app works in mock mode without it
JWT_SECRET=...                  # Session signing (defaults to dev key)
```

## Testing

Tests live in `__tests__/` subdirectories alongside source files. Uses Vitest + jsdom + @testing-library. The `vitest.config.mts` maps `@/` path alias and applies the jsdom environment globally.

## Conventions

- Import alias `@/` maps to `src/` — use it for all internal imports
- Tailwind v4 for all styling; no inline styles
- Shadcn UI components in `src/components/ui/` (config in `components.json`, style: "new-york")
- Pinned dependency versions — do not run `npm audit fix`
- Comments only on genuinely complex or non-obvious code; omit them otherwise
