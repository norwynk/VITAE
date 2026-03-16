# CLAUDE.md — OSW Supplier Tracker

## Project overview

**One Stop Wellness Supplier Tracker** — a React + TypeScript SPA for managing wellness service suppliers in South Africa.

- **Stack**: React 18, TypeScript, Vite, Tailwind CSS v3, React Router v6, Supabase, react-hot-toast
- **Path alias**: `@/` maps to `src/`
- **Primary colour**: teal (`teal-600` / `teal-700`)

## Commands

```bash
npm run dev       # start dev server
npm run build     # tsc + vite build
npm run lint      # ESLint (zero warnings allowed)
npm run preview   # preview production build
```

## Git workflow

- **Branch**: always develop on `claude/[feature-name]-[session-id]`
- **Push**: `git push -u origin claude/<branch>`
- **Never** push to `main` without explicit permission
- Write clear, descriptive commit messages (what changed and why)

## Project structure

```
src/
  App.tsx                  # routes + auth wrappers
  pages/                   # one file per route
  components/ui/Layout.tsx # sidebar + mobile nav
  contexts/AuthContext.tsx
  lib/supabase.ts
  types/supplier.ts        # shared types + SA_PROVINCES
  utils/saId.ts            # SA ID number parser
```

## Code conventions

### Form pages (e.g. AddSupplier)

- Define a `FormData` interface and `EMPTY_FORM` constant at the top
- Errors typed as `Partial<Record<keyof FormData, string>>`
- Use the local `Field` wrapper component for labels + error display
  - Pass `required` prop only when the field is truly required — this renders the `*` indicator
  - Omitting `required` makes the field visually and functionally optional
- Validation lives in a `validate(): FormErrors` function
  - Only add a rule here for fields that are genuinely required
  - Removing a rule here AND the `required` prop together is the correct way to make a field optional
- Use `inputCls(error?)` helper for consistent input styling (red border on error, teal on focus)

### Routing

- Protected routes via `<ProtectedRoute>` (redirects to `/login`)
- Public routes via `<PublicRoute>` (redirects to `/` when already authed)
- All authenticated pages are children of `<Layout />`

### Supabase queries

```ts
supabase.from('table').select('col1, col2').eq('field', value).order('name')
```

- Always handle `.error` before using `.data`
- Use `.single()` when expecting exactly one row

### Styling

- Tailwind utility classes only — no custom CSS beyond `index.css`
- Consistent input class: `rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 px-3.5 py-2.5 text-sm`
- Cards/sections: `bg-white rounded-xl border border-gray-200 p-5` (or `p-6`)
- Primary button: `bg-teal-600 hover:bg-teal-700 text-white`
- Outline/secondary button: `border border-teal-600 text-teal-700 hover:bg-teal-50`

### Navigation (Layout)

- Nav items defined in the `navItems` array — add new routes here
- Each item needs: `to`, `label`, `end` (exact match), `Icon` component
- Mobile: bottom tab bar; Desktop: left sidebar

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_GOOGLE_PLACES_KEY` | Google Places API (New) key |

## Google Places API

Uses the **new** Places API v1:
- Endpoint: `https://places.googleapis.com/v1/places:searchText`
- Auth via `X-Goog-Api-Key` header
- Fields requested via `X-Goog-FieldMask` header
- Queries are scoped to South Africa: `"<category> in <location>, South Africa"`

## User preferences

- When asked to show file contents, always show the **complete** file — the user copies files manually
- Do not change anything beyond what is explicitly requested
- Do not add comments, docstrings, or refactor surrounding code when making targeted changes
