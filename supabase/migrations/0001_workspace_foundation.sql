-- Mepa Ledger — workspace foundation (review only; do not apply without explicit approval)
-- Operational rule: run exactly once via Supabase migration tooling on a clean database.
-- Do not re-run manually. CREATE TABLE (without IF NOT EXISTS) fails fast if objects already exist.
-- Requires: PostgreSQL 15+ (Supabase), auth.users, gen_random_uuid() via pgcrypto (enabled by default on Supabase)

-- ---------------------------------------------------------------------------
-- Extensions (Supabase projects typically have pgcrypto in extensions schema)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums (idempotent via DO blocks for local inspection only; production = run once)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.workspace_type as enum ('individual', 'company');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.workspace_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_status as enum ('active', 'invited', 'suspended');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger: maintain updated_at (no recursive writes)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- Tables (fail-fast: no IF NOT EXISTS — a re-run must error, not silently skip)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone_e164 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null
    or (char_length(trim(display_name)) between 1 and 120)
  ),
  constraint profiles_phone_e164_format check (
    phone_e164 is null
    or phone_e164 ~ '^\+[1-9]\d{6,14}$'
  )
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_type public.workspace_type not null,
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  currency_code text not null default 'GHS',
  timezone text not null default 'Africa/Accra',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_length check (
    char_length(trim(name)) between 1 and 120
  ),
  constraint workspaces_currency_code_format check (
    currency_code ~ '^[A-Z]{3}$'
  ),
  constraint workspaces_timezone_length check (
    char_length(trim(timezone)) between 1 and 64
  )
);

create index workspaces_created_by_idx
  on public.workspaces (created_by);

create index workspaces_archived_at_idx
  on public.workspaces (archived_at)
  where archived_at is not null;

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  role public.workspace_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint workspace_memberships_joined_when_active check (
    status <> 'active'
    or joined_at is not null
  )
);

create index workspace_memberships_user_status_idx
  on public.workspace_memberships (user_id, status);

create index workspace_memberships_workspace_role_idx
  on public.workspace_memberships (workspace_id, role)
  where status = 'active';

-- At most one active owner per workspace (ownership transfer is a future audited operation)
create unique index workspace_memberships_one_active_owner_idx
  on public.workspace_memberships (workspace_id)
  where role = 'owner' and status = 'active';

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  email text not null,
  requested_role public.workspace_role not null,
  token_hash text not null,
  invited_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_invitations_email_normalized check (
    email = lower(trim(email))
    and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ),
  constraint workspace_invitations_role_not_owner check (
    requested_role in ('admin', 'member')
  ),
  constraint workspace_invitations_token_hash_present check (
    char_length(token_hash) >= 32
  ),
  constraint workspace_invitations_expires_after_created check (
    expires_at > created_at
  ),
  constraint workspace_invitations_accept_revoke_exclusive check (
    not (accepted_at is not null and revoked_at is not null)
  ),
  constraint workspace_invitations_no_accept_after_revoke check (
    revoked_at is null or accepted_at is null
  )
);

create unique index workspace_invitations_token_hash_uidx
  on public.workspace_invitations (token_hash);

-- One pending invitation per normalized email per workspace (prevents duplicate active invites)
create unique index workspace_invitations_one_pending_per_email_idx
  on public.workspace_invitations (workspace_id, email)
  where accepted_at is null and revoked_at is null;

create index workspace_invitations_workspace_email_idx
  on public.workspace_invitations (workspace_id, email);

create index workspace_invitations_workspace_pending_idx
  on public.workspace_invitations (workspace_id)
  where accepted_at is null and revoked_at is null;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_action_length check (
    char_length(trim(action)) between 1 and 128
  ),
  constraint audit_events_entity_type_length check (
    char_length(trim(entity_type)) between 1 and 64
  ),
  constraint audit_events_metadata_is_object check (
    jsonb_typeof(metadata) = 'object'
  )
  -- Convention only (NOT database-enforced): metadata must never store passwords,
  -- tokens, API keys, refresh/access tokens, invitation token hashes, or full payment secrets.
);

create index audit_events_workspace_created_idx
  on public.audit_events (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger workspace_memberships_set_updated_at
  before update on public.workspace_memberships
  for each row execute function public.set_updated_at();

create trigger workspace_invitations_set_updated_at
  before update on public.workspace_invitations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER; owner bypasses RLS on reads; fixed search_path)
-- ---------------------------------------------------------------------------

create or replace function public.is_active_workspace_member(
  p_workspace_id uuid,
  p_roles public.workspace_role[] default array['owner', 'admin', 'member']::public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = any (p_roles)
  );
$$;

create or replace function public.is_workspace_owner(
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_workspace_member(
    p_workspace_id,
    array['owner']::public.workspace_role[]
  );
$$;

create or replace function public.is_workspace_admin_or_owner(
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_workspace_member(
    p_workspace_id,
    array['owner', 'admin']::public.workspace_role[]
  );
$$;

revoke all on function public.is_active_workspace_member(uuid, public.workspace_role[]) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
revoke all on function public.is_workspace_admin_or_owner(uuid) from public;

grant execute on function public.is_active_workspace_member(uuid, public.workspace_role[]) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.is_workspace_admin_or_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Trusted workspace creation (atomic; caller becomes sole initial owner)
-- ---------------------------------------------------------------------------

create or replace function public.create_workspace(
  workspace_name text,
  requested_type public.workspace_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_workspace_id uuid;
  v_name text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required to create a workspace'
      using errcode = '42501';
  end if;

  v_name := trim(workspace_name);
  if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'Workspace name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  insert into public.workspaces (
    workspace_type,
    name,
    created_by
  )
  values (
    requested_type,
    v_name,
    v_uid
  )
  returning id into v_workspace_id;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    v_workspace_id,
    v_uid,
    'owner',
    'active',
    now()
  );

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_workspace_id,
    v_uid,
    'workspace.created',
    'workspace',
    v_workspace_id,
    jsonb_build_object(
      'workspace_type', requested_type,
      'name', v_name
    )
  );

  return v_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text, public.workspace_type) from public;
grant execute on function public.create_workspace(text, public.workspace_type) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.audit_events enable row level security;

alter table public.profiles force row level security;
alter table public.workspaces force row level security;
alter table public.workspace_memberships force row level security;
alter table public.workspace_invitations force row level security;
alter table public.audit_events force row level security;

-- profiles: self only
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- workspaces: active members read non-archived rows only; owner updates; no client insert/delete
create policy workspaces_select_active_members
  on public.workspaces
  for select
  to authenticated
  using (
    archived_at is null
    and public.is_active_workspace_member(id)
  );

create policy workspaces_update_owner
  on public.workspaces
  for update
  to authenticated
  using (public.is_workspace_owner(id))
  with check (
    public.is_workspace_owner(id)
    and archived_at is null
  );

-- workspace_memberships: self read; admin/owner read workspace roster; no direct writes
create policy workspace_memberships_select_own
  on public.workspace_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

create policy workspace_memberships_select_admin_roster
  on public.workspace_memberships
  for select
  to authenticated
  using (public.is_workspace_admin_or_owner(workspace_id));

-- invitations: admin/owner read only; no direct writes
create policy workspace_invitations_select_admin
  on public.workspace_invitations
  for select
  to authenticated
  using (public.is_workspace_admin_or_owner(workspace_id));

-- audit_events: admin/owner read only; no direct writes
create policy audit_events_select_admin
  on public.audit_events
  for select
  to authenticated
  using (public.is_workspace_admin_or_owner(workspace_id));

-- ---------------------------------------------------------------------------
-- Privileges: revoke Supabase defaults, grant least privilege to authenticated
-- (RLS still required; grants alone must not allow cross-workspace writes)
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.workspaces from public, anon, authenticated;
revoke all on table public.workspace_memberships from public, anon, authenticated;
revoke all on table public.workspace_invitations from public, anon, authenticated;
revoke all on table public.audit_events from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select on public.workspace_memberships to authenticated;
grant select on public.workspace_invitations to authenticated;
grant select on public.audit_events to authenticated;

-- No insert/update/delete grants on workspaces, memberships, invitations, or audit_events.
-- create_workspace and future SECURITY DEFINER functions run as owner and bypass RLS for controlled writes.

-- Invitation acceptance/expiry enforcement (NOT fully expressible with CHECK + now()):
-- Future accept_workspace_invitation() MUST verify:
--   revoked_at IS NULL
--   accepted_at IS NULL
--   expires_at > now()
-- before setting accepted_at and creating membership.
