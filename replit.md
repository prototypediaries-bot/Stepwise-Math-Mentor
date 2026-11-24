# Margin

A student math assistant that explains highlighted portions of a solution in a closable side panel without adding confusing follow-up replies.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server; use its managed workflow for the assigned port
- `pnpm --filter @workspace/margin run dev` — frontend, started through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- AI uses Replit-managed OpenAI integration configuration; never expose credentials in client code.
- Authentication uses Replit OIDC with PostgreSQL sessions. Private picture uploads require App Storage configuration.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- Ask math, engineering, or science questions and read structured solutions with rendered equations.
- Highlight solution text to open a focused explanation alongside the original solution.
- Use per-step explanation actions on touch devices or with a keyboard.
- Save, reopen, and delete problems in browser-local history. No account or cross-device sync.
- The initial worked example is explicitly labeled; new questions and explanations use live AI.
- Picture uploads use signed URLs directly to private App Storage. The API checks ownership and actual file type/size before using images.
- AI answers are educational assistance, not verified engineering designs; important results require independent checking.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
