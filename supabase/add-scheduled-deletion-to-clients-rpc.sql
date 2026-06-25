-- Migration: surface scheduled_for_deletion_at in admin_get_clients RPC
-- Run this in the Supabase SQL editor for project ockvcyevnozuczzngrwg.
--
-- The grace-period deletion model (main app) sets
-- agency_subscriptions.scheduled_for_deletion_at when a workspace is queued for
-- a permanent purge. The clients list needs this column so the admin portal can
-- badge/filter workspaces that are scheduled for deletion. fetchClientDetail
-- already returns it (it selects * from agency_subscriptions), so only the list
-- RPC needs widening.
--
-- Additive, read-only column. Supersedes add-subscription-fields-to-rpc.sql.

DROP FUNCTION IF EXISTS public.admin_get_clients();

CREATE FUNCTION public.admin_get_clients()
RETURNS TABLE (
  user_id                   uuid,
  agency_name               text,
  email                     text,
  auth_email                text,
  auth_full_name            text,
  plan_name                 text,
  is_active                 boolean,
  trial_ends_at             timestamptz,
  subscription_ends_at      timestamptz,
  scheduled_for_deletion_at timestamptz,
  current_storage_used      bigint,
  max_storage_bytes         bigint,
  created_at                timestamptz,
  logo_url                  text
)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT
    s.user_id,
    s.agency_name,
    s.email,
    u.email                              AS auth_email,
    u.raw_user_meta_data->>'full_name'   AS auth_full_name,
    s.plan_name,
    s.is_active,
    s.trial_ends_at,
    s.subscription_ends_at,
    s.scheduled_for_deletion_at,
    s.current_storage_used,
    s.max_storage_bytes,
    s.created_at,
    s.logo_url
  FROM agency_subscriptions s
  JOIN auth.users u ON u.id = s.user_id;
$$;
