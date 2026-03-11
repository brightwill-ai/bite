# Skill: State Management in Bite

All global state uses Zustand. Use this when creating or editing stores.

## Core Rules

- Use Zustand only for app-global client state.
- Keep stores app-local (`apps/<app>/store/*.ts`).
- Do not use Redux or React Context for cross-page global data.

## Current App Patterns

### `apps/menu`

- `cart` store is in-memory only.
- No persistence middleware.
- Menu/catalog data is fetched from Supabase in page logic, not persisted in localStorage.

### `apps/admin`

- Auth/menu stores are Supabase-backed.
- Do not use `persist` middleware for menu/auth data.
- Call async store actions to load and mutate DB-backed state.
- Keep login/signup UX responsive: avoid blocking route transitions on extra `initialize()` calls when server-protected routes will hydrate state anyway.

## Store Design

- Keep state + actions in one typed interface.
- Use optimistic updates only when error handling is explicit.
- For DB-backed actions, fail safe: if mutation fails, do not mutate local state.
- For context-style setters (restaurant/table/session), no-op when incoming values match current state.

## Example Pattern (DB-backed)

```typescript
interface MenuStore {
  restaurantId: string | null
  items: MenuItem[]
  isLoading: boolean
  loadMenu: (restaurantId: string) => Promise<void>
  updateItem: (id: string, updates: Partial<MenuItem>) => Promise<void>
}
```

Guidelines:

- `loadMenu` should fetch categories/items/modifiers from Supabase.
- Mutations should write to Supabase first, then update local state.
- Keep selectors narrow in components to reduce re-renders.
- In React hooks, subscribe to specific slices/actions instead of passing a full store object into effect dependencies.

## Anti-Patterns

- Re-introducing mock data in runtime stores.
- Persisting Supabase records in localStorage without explicit need.
- Selecting entire store object in components.
- Calling non-idempotent setters from `useEffect` on every render path (can cause `Maximum update depth exceeded`).

## After Changes

Update docs in the same task:

1. `AGENTS.md`
2. `README.md`
3. This skill file
