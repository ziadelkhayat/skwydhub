# AGENTS.md — Skwyd Hub back office (Tremor)

Skwyd Hub back office and admin: React 19 · Vite 8 · TypeScript ~6 · Tailwind CSS v4 · React Router 8 · **Tremor Raw** (Radix UI + tailwind-variants + Remix Icons) · Recharts 2 · TanStack Table 8. Data from Supabase.

**UI rule: use Tremor.** Components live in `src/components/tremor/` (copied from Tremor Raw and the Tremor dashboard template). `src/components/ui/*` are thin wrappers over them that keep older prop names. Lists use `components/tremor/data-table/DataTable`, settings and record pages use `skwyd/ui/Section` (template settings layout), the Summary uses `components/tremor/overview`. Icons: `@remixicon/react` (re-exported under old names from `@/icons`).

## Commands

| Command            | Purpose                                |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Vite dev server                        |
| `npm run build`    | `tsc -b` + Vite production build       |
| `npm run lint`     | Oxlint + ESLint (`lint:fast` = Oxlint) |
| `npm run lint:fix` | Oxlint fixes, then ESLint fixes        |
| `npm run format`   | Prettier across the repo               |

There is no test suite. **Run `npm run build` and `npm run lint` after every change.**

## Where Things Live

```text
src/
├── App.tsx              # THE route registry (static imports, no lazy loading)
├── main.tsx             # StrictMode → BrowserRouter → ThemeProvider → HelmetProvider
│                        #   → I18nProvider → TooltipProvider → App
├── index.css            # All Tailwind v4 config: @theme tokens, @utility classes,
│                        #   dark variant, third-party CSS overrides
├── components/
│   ├── layout/app-layout/   # Dashboard shell (sidebar, header, Outlet)
│   │   └── sidebar/data.tsx # Sidebar nav items (separate from routes)
│   ├── layout/layout-*/     # Shells for the six /layout-* example pages
│   ├── shared/              # Cross-route widgets: page-meta, page-breadcrumb,
│   │                        #   component-card, header controls, …
│   └── ui/                  # Flat Base UI primitives (button.tsx, dialog.tsx, …); no barrel
├── pages/{main,others,support}/<feature>/   # Route features (categories only, see below)
├── contexts/            # ThemeProvider / useTheme only
├── hooks/<hook-name>.ts # Custom hooks
├── i18n/                # i18next setup, hooks, locales (routing.ts), language metadata
├── messages/{en,ar,es,de}.json
├── icons/               # Shared SVG components + barrel; flag-*.svg via `?react`
└── utils/               # cn(), get-initials
```

Path alias: `@/*` → `src/*`.

## Routing

- `src/App.tsx` is the **only** source of routes. Folder structure does not generate URLs, and `pages/main`, `pages/others`, `pages/support` are organizational categories, **not** layout boundaries. Read `App.tsx` to see which layout wraps a page.
- Layout groups in `App.tsx`:
  - **`AppLayout`** (pathless): nearly all pages, including charts, maps, UI elements, and support. Nested layouts under it: `/ai-chat/*`, `/ai-settings/*` (index routes redirect to `text` / `account`), and the email `inbox-layout.tsx` (`/inbox`, `/inbox-details`). `AppLayout` applies full-height handling for `/ai-chat` and `/ai-settings`.
  - **`AuthLayout`** (`pages/others/auth/layout.tsx`): `/signin`, `/signup`, `/reset-password`, `/two-step-verification`. Demo forms only; no guards or sessions.
  - **No layout**: error/status pages (`/error-404`, `/error-500`, `/error-503`, `/coming-soon`, `/maintenance`, `/success`), `/layout-one`…`/layout-six` (own `SidebarProvider`), and the `/*` 404 fallback.
- No dynamic params, locale-prefixed URLs, loaders, or actions. Import `Link`/hooks from `react-router`, never `react-router-dom`.

### Adding a page

1. Create a kebab-case folder under the fitting `pages/` category. Entry is a default export from `index.tsx` (or `page.tsx` when wrapping reusable content with metadata). Some groups export through barrels (`pages/main/pages`, `pages/others/auth`, `pages/main/empty-state`, AI settings, email, support-tickets); follow the neighbor.
2. Colocate page-only components, `data.ts`, `types.ts`, `schema.ts` in that folder. Do not create `src/components/<feature>/`.
3. Add `PageMeta` (`@/components/shared/page-meta`); inner pages usually add `PageBreadcrumb` too.
4. Register the route in `App.tsx` under the right layout.
5. For navigation, add an entry to `components/layout/app-layout/sidebar/data.tsx` **and** its label key `sidebar.items.<key>` to all four message files. Active matching is exact-path, except a prefix match for `/ai-settings`.

## Components and State

- Files/folders lower-kebab-case; components PascalCase. Pages default-export; primitives/utilities named-export.
- Import primitives directly: `import { Button } from "@/components/ui/button";`.
- Build from Tremor Raw components (`src/components/tremor/`, `tailwind-variants`, `cx()`). Don't introduce another component library.
- Dialogs: controlled `open`/`onOpenChange` with `@/components/ui/dialog`. There is no `Modal` or `useModal`.
- Theme: `useTheme` from `@/contexts` (`light` | `dark` | `auto`). Sidebar: `useSidebar` from `@/components/ui/sidebar`.
- Forms: React Hook Form + Zod resolver + colocated schema + `Field`/`FieldLabel`/`FieldError` from `@/components/ui/field`.
- Tables: Tremor `DataTable` on TanStack Table **v8** (the version the Tremor template uses).
- UI demo sections use `ComponentCard`.
- Tasks: local React state + React DnD (`HTML5Backend`); shared task UI in `pages/main/task/`, list/kanban specifics in their subfolders.
- Charts: Tremor charts (Recharts 2, react-is 19 override in package.json).

## i18n

- Never reinitialize i18next (`src/i18n/config.ts`; provider mounted once in `main.tsx`).
- Locales `en` (fallback), `ar` (RTL), `es`, `de`. **Every new user-facing string goes into all four `src/messages/*.json` files.** ICU syntax for interpolation/plurals.
- Use wrappers from `@/i18n`:

  ```tsx
  const t = useTranslations("feature.namespace");
  ```

  `getTranslations` outside components, `useLocale` / `useChangeLocale` for locale. There is no `useLanguage`.

- Some legacy demo text is hardcoded. Don't copy that; translate new or touched UI.

## Styling

- Tailwind v4 config lives only in `src/index.css`. Never add `tailwind.config.*`, CSS Modules, or CSS-in-JS.
- Tailwind's default theme with Inter (`--font-sans`) and Tremor's animations in `@theme`. Colours: Tailwind `blue-*` and `gray-*` as Tremor uses them.
- Always add `dark:` styles for new surfaces, text, borders, and states.
- RTL: use logical utilities (`ms/me`, `ps/pe`, `inset-s/e`, `border-s/e`, `text-start/end`, logical radius) and `rtl:` variants to flip directional icons/transforms.
- Third-party CSS overrides go in the matching section of `index.css`.

## Icons and Assets

- Icons: Remix Icon (`@remixicon/react`), the set Tremor uses; `@/icons` re-exports the ones in use under their old names.
- `public/` assets use root-relative URLs (`/images/...`).

## Boundaries

- Ask before installing packages.
- Don't add route-level code splitting, auth guards, new providers, or a second routing/navigation source of truth without an explicit requirement.
- Promote code to `components/shared` or `components/ui` only when it is genuinely reused across routes.
