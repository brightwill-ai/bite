# Skill: Menu Upload Flow (Claude-First, Sync)

Use this skill when touching menu import in `apps/admin` or parser behavior in `supabase/functions/parse-menu`.

## Scope

Menu upload is synchronous and server-driven:

1. Upload file to Supabase storage + create `menu_uploads` row.
2. Invoke `parse-menu` with upload metadata.
3. Review normalized categories/items before publish.

Primary parsing is Claude-native in the Edge Function. Deterministic parsing remains fallback-only.

## Supported Inputs

- `.pdf`
- `.txt`
- `.png`
- `.jpg` / `.jpeg`
- `.webp`

Guardrail:

- Max file size: 20MB for synchronous parsing

## File Map

- Upload UI + orchestration:
  - `apps/admin/app/(dashboard)/menu/upload/page.tsx`
- Optional local extraction routes (not primary path):
  - `apps/admin/app/api/extract-pdf/route.ts`
  - `apps/admin/app/api/extract-image/route.ts`
- Server parser Edge Function:
  - `supabase/functions/parse-menu/index.ts`

## Upload + Parse Flow

1. Validate extension + size.
2. Ensure there is a live Supabase auth session before invoking `parse-menu` (attempt token refresh first; if still missing/expired, prompt re-login instead of invoking).
3. Upload original file to `menu-uploads` storage bucket.
4. Insert `menu_uploads` row with `status='processing'`.
5. Invoke `parse-menu` with:
   - `uploadId`, `filePath`, `fileName`, `mimeType`
   - explicit `Authorization: Bearer <token>` + `apikey` headers via direct function endpoint call
   - on `401`, refresh session token and retry once, then fallback to anon JWT token to avoid session drift blocking uploads
   - optional `rawText` only for explicit fallback paths
6. Normalize parser output for review UI.
7. If parser returns zero items, keep user on upload step with a clear error.

## Edge Function Rules (`parse-menu`)

- Keep existing storage download and upload status updates.
- Parse primary path:
  - Upload bytes to Anthropic Files API (`/v1/files`, `anthropic-beta: files-api-2025-04-14`)
  - Parse with Messages API (`/v1/messages`) using `output_config.format` JSON schema
- Keep response contract stable:
  - `categories[]`
  - `items[]`
- Normalize/validate parsed output:
  - Drop items missing name or non-positive price
  - Normalize category names, prices, and booleans
  - Mark all items `needs_review=true` when low confidence or heavy validation drops
- Retry once with backoff for transient Anthropic failures (`429`/`5xx`)
- Apply request timeout with `AbortController`
- Keep deterministic parser fallback only when Claude fails and usable text exists
- Keep PDF corruption safeguards:
  - failed PDF extraction returns empty text (never decode raw PDF bytes)
  - symbol-heavy extracted text is invalid for deterministic fallback
- Do not enable citations when using structured outputs (`output_config.format`)

## Secrets

Required for `parse-menu`:

- `ANTHROPIC_API_KEY`

Optional overrides:

- `ANTHROPIC_MODEL` (default `claude-haiku-4-5`; parser also has a Sonnet fallback path and JSON-text fallback when structured output is unsupported)
- `ANTHROPIC_TIMEOUT_MS` (default `25000`)

## Operational Expectations

- Clean text PDF: most items parsed with few review flags.
- Scanned/photo menus: parsed best-effort with review flags.
- Poor quality files: no crash; return empty parse + actionable error guidance.
- Claude outage/rate limits: deterministic fallback used when text exists.

## When You Change This Flow

Update docs in the same task:

1. `AGENTS.md`
2. `README.md`
3. `.claude/skills/supabase.md`
4. This skill file
