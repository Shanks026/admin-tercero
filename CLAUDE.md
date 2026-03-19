# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test framework is configured yet.

## Architecture

**Cadence** is a React 19 SPA (social media management platform) built with Vite, Tailwind CSS v4, and Supabase for auth/database.

### App Shell & Routing

Authentication state is managed in [src/App.jsx](src/App.jsx) via Supabase real-time listener. Unauthenticated users are routed to `/login` or `/signup`; authenticated users get the `AppShell` layout via `<Outlet />`.

Layout hierarchy:
- `main.jsx` — wraps with `ThemeProvider`, `SidebarProvider`, `BrowserRouter`
- `App.jsx` — auth state + route guards
- `AppShell.jsx` — sidebar + header + body flex layout
- `AppHeader.jsx` / `AppBody.jsx` — slot components

### Component Organization

- `src/components/ui/` — shadcn/ui components (do not edit directly; regenerate via shadcn CLI)
- `src/components/sidebar/` — collapsible navigation sidebar with user menu
- `src/components/auth/` — login/signup forms (React Hook Form + Zod)
- `src/components/misc/` — `ThemeProvider` and theme toggle

### Key Patterns

- **Path alias**: `@` maps to `./src` (configured in both `vite.config.js` and `jsconfig.json`)
- **Styling**: Tailwind CSS v4 via Vite plugin; CSS variables for theming; `cn()` utility from `src/lib/utils.js` for merging class names
- **Forms**: React Hook Form + Zod schema validation
- **Icons**: Lucide React

### Supabase

Client is initialized in `src/lib/supabase.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`. Auth state changes are subscribed to in `App.jsx` with `supabase.auth.onAuthStateChange`.

### shadcn/ui

Configured in `components.json` with style `new-york`, neutral base color, and Lucide icons. Add new components with:
```bash
npx shadcn@latest add <component>
```
