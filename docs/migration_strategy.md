# Phase 2 Migration Strategy

This is the rollout strategy used for Phase 2 backend wiring.

## Rollout Steps

1. Start with Supabase wiring in code while keeping a mock fallback path available in development.
2. Deploy with backend features disabled in production environments.
3. Seed database content for baseline restaurants and menus.
4. Validate auth, menu reads, order creation, and admin CRUD in staging.
5. Enable backend path in production.
6. Remove temporary fallback gating once production validation is complete.

## Current State

- Runtime data is now fully Supabase-backed in `apps/menu` and `apps/admin`.
- Mock data remains only as fixture/reference data in `packages/types/mock.ts`.
- Temporary rollout gating is no longer used in production runtime paths.
