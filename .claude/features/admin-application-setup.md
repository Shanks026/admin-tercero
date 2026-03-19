# admin-tercero — Claude Code Instructions

This is the authoritative instruction file for building **admin-tercero**, an internal CRM and operations tool for managing Tercero's prospect-to-client lifecycle. Read this file in full before writing a single line of code.

---

## What This App Is

`admin-tercero` is a private internal dashboard for the Tercero founder. It lives at `admin.tercerospace.com` and shares the same Supabase instance as the main Tercero application. It is **not** a customer-facing product. It has one user: the super admin.

**Purpose**: Manage cold leads → trial users → paying clients → feedback and bug reports in one unified internal workspace.

---

## Critical Rules Before You Start

### 1. Analyse the database first — do not guess schema

Use the **Supabase MCP** to inspect the existing database before creating any tables, writing any queries, or making any assumptions about schema. Run:

```
- List all existing tables
- Read the schema for: profiles, agency_subscriptions, agency_members, auth.users
- Identify foreign key relationships
- Note any existing RLS policies
```

Do not proceed to any implementation until you have read and understood the existing schema. **Do not modify, drop, or alter any existing Tercero tables.** All new tables use the `admin_` prefix to stay clearly separated.

### 2. Stop after every phase — wait for explicit approval

After completing each phase, present a summary of what was built and what was tested. Do not begin the next phase until the user explicitly says to proceed.

### 3. Use the design system

The design system is documented in the `tercero-design-system` skill. Follow it precisely. This app must look and feel identical to the main Tercero application — same typography, same card patterns, same tab style, same empty states, same spacing tokens.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + React Router 7 |
| Build tool | Vite |
| Styling | Tailwind CSS 4 |
| UI components | shadcn/ui (New York style, neutral base) |
| Icons | lucide-react only |
| Data fetching | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Notifications | sonner |
| Backend | Supabase (shared instance with Tercero) |
| Font | Google Sans (load via Google Fonts in index.html) |
| Deployment target | Vercel → admin.tercerospace.com via Cloudflare |

---

## Project Structure

```
admin-tercero/
├── public/
├── src/
│   ├── api/                  # All Supabase calls — never in components
│   │   ├── prospects.js
│   │   ├── clients.js
│   │   └── feedback.js
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   ├── misc/
│   │   │   ├── CustomTable.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── header-context.jsx
│   │   ├── layout/
│   │   │   ├── AppShell.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Header.jsx
│   │   └── prospects/
│   │       └── ProspectDrawer.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── utils.js          # cn() utility
│   │   ├── supabase.js       # Supabase client
│   │   └── helper.js         # formatDate(), formatCurrency()
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── prospects/
│   │   │   └── ProspectsPage.jsx
│   │   ├── clients/
│   │   │   └── ClientsPage.jsx
│   │   └── feedback/
│   │       └── FeedbackPage.jsx
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
└── .env.local
```

---

## Authentication

### Super Admin Account

There is **one** user for this app. The account is created directly in Supabase Auth by the founder — not through any signup flow in this app.

**How it works:**
- The existing `profiles` table (or equivalent) has a `role` column
- The super admin account has `role = 'superadmin'` set directly in Supabase
- On login, after Supabase Auth succeeds, the app checks this role
- If `role !== 'superadmin'`, the session is immediately signed out and an error is shown
- No other account can access this app

**Before implementing auth:**
1. Use Supabase MCP to confirm the exact column name for role in the profiles table
2. Confirm the table name (may be `profiles`, `users`, or similar)
3. Read the existing RLS policies on that table

**AuthContext responsibilities:**
- Expose: `user`, `loading`, `signOut()`
- On mount: check session → fetch profile → verify `role === 'superadmin'` → if not, sign out
- Wrap the entire app — all routes except `/login` require auth

**Login page:**
- Email + password form only
- No signup link, no forgot password for now
- On success: redirect to `/prospects`
- On role check failure: show "Access denied" message, sign out

```jsx
// Route protection pattern
<Route path="/*" element={
  <RequireAuth>
    <AppShell />
  </RequireAuth>
} />
```

---

## Supabase Client Setup

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

`.env.local` — use the **same** Supabase URL and anon key as the main Tercero app. Same project, same database.

---

## API Layer Rules

- All Supabase calls live in `src/api/[feature].js` — never inside components
- React Query hooks for reads, plain async functions for mutations called via `useMutation`
- Query key pattern: `['admin', 'prospects', 'list', { filters }]` and `['admin', 'prospects', 'detail', id]`
- Always invalidate relevant query keys after mutations
- Always handle errors — surface via `toast.error()`

---

## Design System Rules

Follow the `tercero-design-system` skill exactly. Key patterns repeated here for reference:

**Page wrapper:**
```jsx
<div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
```

**Page title:**
```jsx
<h1 className="text-3xl font-light tracking-tight">
  Prospects <span className="text-muted-foreground/50 ml-2 font-extralight">{count}</span>
</h1>
```

**Tabs:** always underline variant — see design system
**Cards:** `shadow-none`, interactive cards use `hover:bg-accent/30`
**Empty states:** always use `<Empty>` component family
**Loading:** skeleton screens, not spinners
**Notifications:** `sonner` only — never `alert()`
**Icons:** `lucide-react` only — no other icon libraries
**Forms:** React Hook Form + Zod always
**Dark mode:** CSS token classes only — never hardcode hex values

---

## Sidebar Navigation

```
admin-tercero sidebar sections:

[Logo + "Admin" label at top]

PIPELINE
- Prospects        /prospects
- Clients          /clients

SUPPORT
- Feedback         /feedback

[User avatar + sign out at bottom]
```

Sidebar is collapsible (icon-only mode). Same pattern as Tercero's app-sidebar. Active route highlighted. Lucide icons per section.

---

## Database — New Tables

> **Before creating any table**, use Supabase MCP to confirm the table does not already exist and that there are no naming conflicts.

### `admin_prospects`

```sql
create table admin_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  agency_name text not null,
  email text not null unique,
  phone text,
  source text not null default 'manual',
  -- source values: 'apollo', 'google_maps', 'referral', 'friend', 'manual', 'direct_signup'
  status text not null default 'new',
  -- status values: 'new', 'contacted', 'demo_scheduled', 'demo_done', 'trial_started', 'converted', 'dead'
  notes text,
  next_action text,
  next_action_date timestamptz,
  tercero_user_id uuid references auth.users(id) on delete set null,
  -- linked once they sign up to Tercero
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `admin_outreach_log`

```sql
create table admin_outreach_log (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references admin_prospects(id) on delete cascade,
  channel text not null,
  -- channel values: 'whatsapp', 'instagram', 'email', 'call', 'in_person'
  note text,
  contacted_at timestamptz not null default now()
);
```

### `admin_feedback`

```sql
create table admin_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  -- always populated — pulled from Supabase auth in the Tercero app
  email text,
  agency_name text,
  submitted_by_role text,
  -- 'admin' or 'member' — pulled from agency_members at time of submission
  type text not null,
  -- 'bug', 'feedback', 'suggestion'
  title text not null,
  description text not null,
  severity text,
  -- 'low', 'medium', 'high' — only for bugs
  status text not null default 'open',
  -- 'open', 'in_progress', 'resolved', 'dismissed'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Supabase Trigger — Auto-link on signup

```sql
create or replace function admin_link_prospect_on_signup()
returns trigger as $$
declare
  matched_prospect_id uuid;
begin
  -- Try to match by email
  select id into matched_prospect_id
  from admin_prospects
  where email = new.email
  limit 1;

  if matched_prospect_id is not null then
    -- Link user and promote status
    update admin_prospects
    set
      tercero_user_id = new.id,
      status = 'trial_started',
      updated_at = now()
    where id = matched_prospect_id;
  else
    -- Organic signup — create a new prospect record
    insert into admin_prospects (name, agency_name, email, source, status, tercero_user_id)
    values (
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      coalesce(new.raw_user_meta_data->>'agency_name', 'Unknown'),
      new.email,
      'direct_signup',
      'trial_started',
      new.id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_tercero_user_signup
  after insert on auth.users
  for each row execute procedure admin_link_prospect_on_signup();
```

> **Important**: Before creating this trigger, use Supabase MCP to check if any existing triggers on `auth.users` already exist. Do not conflict with them.

---

## RLS Policies

All new `admin_*` tables should be readable and writable only by the super admin. Since this app uses the same anon key as Tercero, RLS must enforce access.

```sql
-- Enable RLS on all admin tables
alter table admin_prospects enable row level security;
alter table admin_outreach_log enable row level security;
alter table admin_feedback enable row level security;

-- Policy: only superadmin can access admin tables
-- Check the exact role column name via Supabase MCP before writing these

create policy "superadmin_only" on admin_prospects
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'superadmin'
    )
  );

-- Repeat for admin_outreach_log and admin_feedback
```

> **Before writing RLS policies**: use Supabase MCP to confirm the profiles table name, the role column name, and the exact value used for the super admin role.

```sql
-- admin_feedback is also written to by regular Tercero users (from the in-app form)
-- so its INSERT policy must allow any authenticated user to insert
create policy "any_authenticated_can_submit_feedback" on admin_feedback
  for insert
  with check (auth.uid() is not null);

-- But SELECT, UPDATE are superadmin only
create policy "superadmin_can_read_feedback" on admin_feedback
  for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'superadmin'
    )
  );
```

---

## Phase 1 — Prospect Pipeline

**Goal**: Import leads, track outreach, manage status pipeline.

### Checklist

- [ ] Project scaffolded — Vite + React 19 + React Router 7 + Tailwind 4 + shadcn New York
- [ ] `src/lib/supabase.js` configured with env vars
- [ ] `src/lib/utils.js` with `cn()` utility
- [ ] `src/lib/helper.js` with `formatDate()` and `formatCurrency()`
- [ ] Google Sans loaded in `index.html`
- [ ] AuthContext with super admin role check
- [ ] Login page — email/password, role verification, access denied state
- [ ] RequireAuth route wrapper
- [ ] AppShell with collapsible sidebar
- [ ] Sidebar: Prospects, Clients, Feedback sections + sign out
- [ ] `admin_prospects` table created via Supabase MCP
- [ ] `admin_outreach_log` table created via Supabase MCP
- [ ] RLS policies applied to both tables
- [ ] `src/api/prospects.js` — useProspects, useProspect, createProspect, updateProspect, deleteProspect, useOutreachLog, addOutreachEntry
- [ ] Prospects page — full table view using CustomTable
- [ ] Table columns: Name + Agency, Source badge, Status badge, Next Action, Next Action Date, Created At, Actions menu
- [ ] Search bar — filters by name, agency name, email
- [ ] Status filter dropdown — all statuses
- [ ] Source filter dropdown — all sources
- [ ] Stats bar — Total, Contacted, Demo Scheduled, Converted counts
- [ ] CSV import — file upload button, parse CSV, map columns, bulk insert
- [ ] Prospect detail drawer (Sheet) — all fields editable inline
- [ ] Drawer sections: Profile, Status + Next Action, Outreach Log
- [ ] Outreach log — chronological list of entries + add new entry form (channel, note, date)
- [ ] Status update from drawer — dropdown, saves immediately
- [ ] Delete prospect — AlertDialog confirmation
- [ ] Empty state — no prospects yet
- [ ] Empty state — no results for active filters
- [ ] Skeleton loading for table
- [ ] All mutations show sonner success/error toasts

**Stop here. Present summary. Wait for approval before Phase 2.**

---

## Phase 2 — Trial & Client Tracking

**Goal**: Auto-link Tercero signups to prospects. Clients section showing live subscription data.

### Pre-phase checklist

Before writing any code for this phase:
- [ ] Use Supabase MCP to read the full schema of `agency_subscriptions`
- [ ] Confirm column names: plan, trial_ends_at, created_at, current_storage_used, etc.
- [ ] Read schema of `profiles` or equivalent user profile table
- [ ] Check for existing triggers on `auth.users` — do not conflict

### Checklist

- [ ] `admin_link_prospect_on_signup` trigger created via Supabase MCP
- [ ] Trigger tested — new signup with matching email promotes status to `trial_started`
- [ ] Trigger tested — new signup with no match creates a `direct_signup` prospect record
- [ ] `src/api/clients.js` — useClients, useClient (joins admin_prospects + agency_subscriptions + profiles)
- [ ] Clients page — table view, shows only prospects with status `trial_started` or `converted`
- [ ] Table columns: Agency Name, Plan badge, Trial Expiry (with countdown), MRR, Signup Date, Status, Actions
- [ ] Plan badge colors: Ignite = blue, Velocity = purple, Quantum = emerald, Trial = orange
- [ ] Churn risk flag — trial expiring in ≤ 3 days with no paid plan = amber warning indicator
- [ ] Client detail page (`/clients/:id`) — full profile view
- [ ] Detail page sections:
  - Profile (name, agency, email, phone, source)
  - Subscription (plan, trial expiry, MRR, storage used)
  - Prospect history (original source, outreach log, status timeline)
  - Feedback tab (their submissions from admin_feedback — empty until Phase 3)
- [ ] Status can be manually updated from client detail (e.g. mark as Converted)
- [ ] Empty state — no clients yet
- [ ] Skeleton loading

**Stop here. Present summary. Wait for approval before Phase 3.**

---

## Phase 3 — Feedback & Bug Management

**Goal**: In-app feedback form in Tercero feeds into admin app. Global and per-client views.

### This phase has two parts — Tercero app changes and admin app changes

> **Important**: The feedback form is added to the **main Tercero application**, not this project. Coordinate with the Tercero codebase for that part. The admin app only reads from `admin_feedback`.

### Part A — Tercero app (feedback submission)

This is built in the main Tercero repo, not admin-tercero. Document here for reference:

- Feedback button — persistent in Tercero's sidebar footer, visible to all roles (admin and member)
- Opens a Sheet/Dialog with the feedback form
- Form fields: Type (bug / feedback / suggestion), Title, Description, Severity (shown only if type = bug)
- On submit: inserts to `admin_feedback` with `user_id` from auth, pulls `email` and `agency_name` from profile, pulls `submitted_by_role` from `agency_members`
- Success toast: "Thanks — we've received your feedback"
- No confirmation email for now

### Part B — admin-tercero (feedback management)

**Pre-phase checklist:**
- [ ] Use Supabase MCP to confirm `admin_feedback` table exists and RLS is correct
- [ ] Confirm the join path from `user_id` → agency name → plan (via profiles + agency_members + agency_subscriptions)

**Checklist:**
- [ ] `admin_feedback` table created (if not already done in Phase 1 setup)
- [ ] RLS: any authenticated Tercero user can INSERT, only superadmin can SELECT/UPDATE
- [ ] `src/api/feedback.js` — useFeedback, useFeedbackDetail, updateFeedbackStatus
- [ ] Global Feedback page (`/feedback`) — table view, all submissions across all users
- [ ] Table columns: Type badge, Severity badge (bugs only), Title, Submitted By (name + role), Agency, Plan, Date, Status badge, Actions
- [ ] Filter bar: Type dropdown, Severity dropdown, Status dropdown, Plan dropdown, search
- [ ] Status update — inline dropdown per row: Open → In Progress → Resolved → Dismissed
- [ ] Feedback detail drawer — full description, submitter info, agency context, plan, status history
- [ ] Per-client feedback tab — on Client detail page (`/clients/:id`), Feedback tab shows only that agency's submissions
- [ ] Handles unmatched users (no prospect record) — shows "Direct Signup" label with profile data from Supabase
- [ ] Stats bar: Open, In Progress, Resolved counts + breakdown by type
- [ ] Empty state — no feedback yet
- [ ] Skeleton loading

**Stop here. Present summary. Final review before deployment.**

---

## Status Badge Reference

### Prospect Status

```jsx
const PROSPECT_STATUS = {
  new:            'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  contacted:      'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  demo_scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
  demo_done:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
  trial_started:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
  converted:      'bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-400',
  dead:           'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
}
```

### Feedback Type

```jsx
const FEEDBACK_TYPE = {
  bug:        'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400',
  feedback:   'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  suggestion: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
}
```

### Feedback Severity

```jsx
const FEEDBACK_SEVERITY = {
  low:    'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
  medium: 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  high:   'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400',
}
```

### Plan Badge

```jsx
const PLAN_BADGE = {
  trial:    'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  ignite:   'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  velocity: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
  quantum:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
}
```

---

## CSV Import — Column Mapping

The CSV import on the Prospects page should handle exports from Apollo and Google Maps. Map these common column names:

| CSV Column (possible names) | Maps to |
|----------------------------|---------|
| Name, Full Name, Contact Name | `name` |
| Company, Agency, Organization, Business Name | `agency_name` |
| Email, Email Address | `email` |
| Phone, Mobile, Phone Number | `phone` |

Source is set by the user before upload via a dropdown (Apollo / Google Maps / Manual). All imported rows get that source tag.

Validate: skip rows with no email. Show import summary: "47 imported, 3 skipped (missing email)".

---

## Environment Variables

```
VITE_SUPABASE_URL=        # same as main Tercero app
VITE_SUPABASE_ANON_KEY=   # same as main Tercero app
```

---

## What This App Is NOT

- Not a customer-facing product
- Not multi-user — one super admin only
- No signup flow for end users
- No payment handling
- No email sending (Phase 4)
- No AI features (Phase 4)
- No social media integrations

---

## Phase 4 — Deferred (do not build now)

- Gmail integration for replying to feedback
- AI-drafted response suggestions
- Workflow triggers (trial expiry nudges, conversion reminders)
- WhatsApp notifications
- Advanced analytics and revenue dashboards

---

## Final Reminders

1. **Supabase MCP first** — read the existing schema before every phase. Never guess.
2. **Stop after every phase** — present summary, wait for explicit approval.
3. **admin_ prefix** — every new table, every new function, every trigger uses this prefix.
4. **Never touch Tercero tables** — no ALTER, no DROP, no policy changes on existing tables.
5. **Design system** — follow `tercero-design-system` skill exactly. Same look, same feel as Tercero.
6. **Role check on every protected route** — if `role !== 'superadmin'`, sign out immediately.