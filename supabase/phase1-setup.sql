-- ============================================================
-- Phase 1: admin_prospects + admin_outreach_log + RLS
-- Already applied to project ockvcyevnozuczzngrwg via MCP.
-- Re-runnable (uses IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- 1. admin_prospects
create table if not exists admin_prospects (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. admin_outreach_log
create table if not exists admin_outreach_log (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references admin_prospects(id) on delete cascade,
  channel text not null,
  -- channel values: 'whatsapp', 'instagram', 'email', 'call', 'in_person'
  note text,
  contacted_at timestamptz not null default now()
);

-- 3. Enable RLS
alter table admin_prospects enable row level security;
alter table admin_outreach_log enable row level security;

-- 4. RLS Policies — superadmin only (checks agency_members.system_role)
drop policy if exists "superadmin_only_prospects" on admin_prospects;
create policy "superadmin_only_prospects"
  on admin_prospects
  for all
  using (
    exists (
      select 1 from agency_members
      where agency_members.member_user_id = auth.uid()
        and agency_members.system_role = 'superadmin'
    )
  );

drop policy if exists "superadmin_only_outreach" on admin_outreach_log;
create policy "superadmin_only_outreach"
  on admin_outreach_log
  for all
  using (
    exists (
      select 1 from agency_members
      where agency_members.member_user_id = auth.uid()
        and agency_members.system_role = 'superadmin'
    )
  );

-- 5. updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists admin_prospects_updated_at on admin_prospects;
create trigger admin_prospects_updated_at
  before update on admin_prospects
  for each row execute procedure set_updated_at();

-- ============================================================
-- Superadmin user setup (already applied — for reference)
-- ============================================================
-- 1. agency_members.system_role constraint was expanded:
--    CHECK (system_role = ANY (ARRAY['admin', 'member', 'superadmin']))
--
-- 2. Auth user created: winterworksbusiness@gmail.com
--    ID: 105baacd-22df-4fa1-b235-0971291fdf11
--    Temp password: Tercero@Admin2026!
--
-- 3. agency_members updated:
--    UPDATE agency_members SET system_role = 'superadmin'
--    WHERE member_user_id = '105baacd-22df-4fa1-b235-0971291fdf11';
-- ============================================================
