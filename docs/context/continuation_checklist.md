# Continuation Checklist After Compaction

## 1. Re-orient

- Read `docs/context/phase2_status_2026-03-10.md` first.
- Run `git status --short`.
- Confirm pending blockers in `to do list.md`.

## 2. Health Check

- Run `npm run typecheck`.
- Run `npm run lint`.

## 3. Remaining Work (Phase 2)

1. Set GitHub secret `SUPABASE_SERVICE_ROLE_KEY`.
2. Retry deploying latest local `supabase/functions/parse-menu/index.ts` to Supabase (MCP deploy currently errors on large existing-function updates).

## 4. Supabase Validation Commands

- `list_migrations`
- `list_edge_functions`
- `get_logs` (`edge-function`, `api`)

## 5. Before Next Handoff

1. Re-run `npm run typecheck` and `npm run lint`.
2. Update this file and `docs/context/phase2_status_2026-03-10.md` with any new blockers.
