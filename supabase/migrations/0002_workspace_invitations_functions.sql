-- Mepa Ledger — workspace invitation functions (review only; do not apply without explicit approval)
-- Operational rule: apply only after docs/workspace-invitations-security-review.md is approved.
-- Prerequisite: 0001_workspace_foundation.sql must already be applied exactly once.
-- Does NOT modify 0001 objects except adding new functions/types; no new RLS policies.
--
-- SECURITY BOUNDARY (enforced by GRANT, not comments):
--   Browser (authenticated role) may EXECUTE list + revoke only.
--   Token material is generated/handled only inside server-only functions granted to
--   service_role. React must never call create/accept RPCs and must never supply
--   p_token_hash or p_raw_token to PostgreSQL.

-- ---------------------------------------------------------------------------
-- Safe return shape (no token_hash, no raw token)
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.workspace_invitation_safe as (
    id uuid,
    workspace_id uuid,
    email text,
    requested_role public.workspace_role,
    invited_by uuid,
    expires_at timestamptz,
    accepted_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz
  );
exception
  when duplicate_object then null;
end $$;

-- Server-only delivery shape: raw_token returned ONLY to service_role callers
-- (Supabase Edge Function). Never granted to authenticated/anon.
do $$
begin
  create type public.workspace_invitation_server_result as (
    invitation public.workspace_invitation_safe,
    raw_token text
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Internal helpers (REVOKE ALL FROM PUBLIC; not granted to authenticated/anon)
-- ---------------------------------------------------------------------------

create or replace function public._normalize_invitee_email(p_email text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(trim(p_email));
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'A valid email address is required'
      using errcode = '22023';
  end if;
  return v_email;
end;
$$;

create or replace function public._user_email_by_id(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(trim(u.email))
  from auth.users u
  where u.id = p_user_id;
$$;

create or replace function public._member_active_workspace_role(
  p_workspace_id uuid,
  p_user_id uuid
)
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select wm.role
  from public.workspace_memberships wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = p_user_id
    and wm.status = 'active'
  limit 1;
$$;

create or replace function public._generate_invitation_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select encode(extensions.gen_random_bytes(32), 'base64url');
$$;

create or replace function public._hash_invitation_token(p_raw_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(trim(p_raw_token), 'sha256'), 'hex');
$$;

revoke all on function public._normalize_invitee_email(text) from public;
revoke all on function public._user_email_by_id(uuid) from public;
revoke all on function public._member_active_workspace_role(uuid, uuid) from public;
revoke all on function public._generate_invitation_token() from public;
revoke all on function public._hash_invitation_token(text) from public;

-- ---------------------------------------------------------------------------
-- 1. create_workspace_invitation — SERVER ONLY (service_role)
-- Generates token + hash inside PostgreSQL. No browser-supplied token material.
-- p_inviter_user_id MUST be set by Edge Function from verified JWT sub claim.
-- auth.uid() is NOT used (service_role calls do not preserve end-user JWT context).
-- ---------------------------------------------------------------------------

create or replace function public.create_workspace_invitation(
  p_workspace_id uuid,
  p_invitee_email text,
  p_requested_role public.workspace_role,
  p_inviter_user_id uuid
)
returns public.workspace_invitation_server_result
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_inviter_role public.workspace_role;
  v_email text;
  v_inviter_email text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
  v_raw_token text;
  v_token_hash text;
  v_safe public.workspace_invitation_safe;
  v_result public.workspace_invitation_server_result;
begin
  if p_inviter_user_id is null then
    raise exception 'Inviter user identity is required'
      using errcode = '42501';
  end if;

  if p_requested_role = 'owner' then
    raise exception 'Owner role cannot be requested via invitation'
      using errcode = '22023';
  end if;

  v_inviter_role := public._member_active_workspace_role(
    p_workspace_id,
    p_inviter_user_id
  );
  if v_inviter_role is null then
    raise exception 'Active workspace membership required'
      using errcode = '42501';
  end if;

  if v_inviter_role = 'admin' and p_requested_role <> 'member' then
    raise exception 'Admins may invite members only'
      using errcode = '42501';
  end if;

  if v_inviter_role = 'member' then
    raise exception 'Insufficient role to create invitations'
      using errcode = '42501';
  end if;

  v_email := public._normalize_invitee_email(p_invitee_email);
  v_inviter_email := public._user_email_by_id(p_inviter_user_id);

  if v_inviter_email is not null and v_email = v_inviter_email then
    raise exception 'You cannot invite your own email address'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from auth.users u
    inner join public.workspace_memberships wm
      on wm.user_id = u.id
    where lower(trim(u.email)) = v_email
      and wm.workspace_id = p_workspace_id
      and wm.status = 'active'
  ) then
    raise exception 'This email is already an active member of this workspace'
      using errcode = '23505';
  end if;

  v_raw_token := public._generate_invitation_token();
  v_token_hash := public._hash_invitation_token(v_raw_token);
  v_expires_at := now() + interval '7 days';

  insert into public.workspace_invitations (
    workspace_id,
    email,
    requested_role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    p_workspace_id,
    v_email,
    p_requested_role,
    v_token_hash,
    p_inviter_user_id,
    v_expires_at
  )
  returning id into v_invitation_id;

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_workspace_id,
    p_inviter_user_id,
    'invitation.created',
    'workspace_invitation',
    v_invitation_id,
    jsonb_build_object(
      'email', v_email,
      'requested_role', p_requested_role,
      'expires_at', v_expires_at
    )
  );

  select
    wi.id,
    wi.workspace_id,
    wi.email,
    wi.requested_role,
    wi.invited_by,
    wi.expires_at,
    wi.accepted_at,
    wi.revoked_at,
    wi.created_at
  into v_safe
  from public.workspace_invitations wi
  where wi.id = v_invitation_id;

  v_result.invitation := v_safe;
  v_result.raw_token := v_raw_token;

  return v_result;
end;
$$;

revoke all on function public.create_workspace_invitation(
  uuid,
  text,
  public.workspace_role,
  uuid
) from public, anon, authenticated;
grant execute on function public.create_workspace_invitation(
  uuid,
  text,
  public.workspace_role,
  uuid
) to service_role;

-- ---------------------------------------------------------------------------
-- 2. list_workspace_invitations — BROWSER SAFE (authenticated)
-- Owner/Admin only; safe fields only; uses auth.uid() via existing helpers.
-- ---------------------------------------------------------------------------

create or replace function public.list_workspace_invitations(
  p_workspace_id uuid
)
returns setof public.workspace_invitation_safe
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required to list invitations'
      using errcode = '42501';
  end if;

  if not public.is_workspace_admin_or_owner(p_workspace_id) then
    raise exception 'Insufficient role to list invitations'
      using errcode = '42501';
  end if;

  return query
  select
    wi.id,
    wi.workspace_id,
    wi.email,
    wi.requested_role,
    wi.invited_by,
    wi.expires_at,
    wi.accepted_at,
    wi.revoked_at,
    wi.created_at
  from public.workspace_invitations wi
  where wi.workspace_id = p_workspace_id
  order by wi.created_at desc;
end;
$$;

revoke all on function public.list_workspace_invitations(uuid) from public;
grant execute on function public.list_workspace_invitations(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. revoke_workspace_invitation — BROWSER SAFE (authenticated)
-- Issuer or Owner/Admin; pending only; uses auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.revoke_workspace_invitation(
  p_workspace_id uuid,
  p_invitation_id uuid
)
returns public.workspace_invitation_safe
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_invitation public.workspace_invitations%rowtype;
  v_result public.workspace_invitation_safe;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required to revoke an invitation'
      using errcode = '42501';
  end if;

  select *
  into v_invitation
  from public.workspace_invitations wi
  where wi.id = p_invitation_id
    and wi.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Invitation not found'
      using errcode = 'P0002';
  end if;

  if v_invitation.accepted_at is not null then
    raise exception 'Accepted invitations cannot be revoked'
      using errcode = '22023';
  end if;

  if v_invitation.revoked_at is not null then
    raise exception 'Invitation is already revoked'
      using errcode = '22023';
  end if;

  if v_invitation.invited_by <> v_uid
    and not public.is_workspace_admin_or_owner(p_workspace_id)
  then
    raise exception 'Insufficient role to revoke this invitation'
      using errcode = '42501';
  end if;

  update public.workspace_invitations wi
  set revoked_at = now()
  where wi.id = p_invitation_id;

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_workspace_id,
    v_uid,
    'invitation.revoked',
    'workspace_invitation',
    p_invitation_id,
    jsonb_build_object(
      'email', v_invitation.email,
      'requested_role', v_invitation.requested_role
    )
  );

  select
    wi.id,
    wi.workspace_id,
    wi.email,
    wi.requested_role,
    wi.invited_by,
    wi.expires_at,
    wi.accepted_at,
    wi.revoked_at,
    wi.created_at
  into v_result
  from public.workspace_invitations wi
  where wi.id = p_invitation_id;

  return v_result;
end;
$$;

revoke all on function public.revoke_workspace_invitation(uuid, uuid) from public;
grant execute on function public.revoke_workspace_invitation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. accept_workspace_invitation — SERVER ONLY (service_role)
-- Raw token accepted only inside trusted server boundary.
-- p_accepter_user_id MUST be set by Edge Function from verified JWT sub claim.
-- Returns workspace_id only (safe). Never returns raw token or token_hash.
-- ---------------------------------------------------------------------------

create or replace function public.accept_workspace_invitation(
  p_raw_token text,
  p_accepter_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_auth_email text;
  v_token_hash text;
  v_invitation public.workspace_invitations%rowtype;
  v_existing_membership public.workspace_memberships%rowtype;
begin
  if p_accepter_user_id is null then
    raise exception 'Accepter user identity is required'
      using errcode = '42501';
  end if;

  if p_raw_token is null or char_length(trim(p_raw_token)) < 32 then
    raise exception 'Invalid invitation token'
      using errcode = '22023';
  end if;

  v_auth_email := public._user_email_by_id(p_accepter_user_id);
  if v_auth_email is null then
    raise exception 'Authenticated user email is required to accept an invitation'
      using errcode = '22023';
  end if;

  v_token_hash := public._hash_invitation_token(p_raw_token);

  select *
  into v_invitation
  from public.workspace_invitations wi
  where wi.token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Invalid or expired invitation'
      using errcode = 'P0002';
  end if;

  if v_invitation.accepted_at is not null then
    select *
    into v_existing_membership
    from public.workspace_memberships wm
    where wm.workspace_id = v_invitation.workspace_id
      and wm.user_id = p_accepter_user_id
      and wm.status = 'active';

    if found then
      return v_invitation.workspace_id;
    end if;

    raise exception 'Invitation has already been used'
      using errcode = '22023';
  end if;

  if v_invitation.revoked_at is not null then
    raise exception 'Invitation has been revoked'
      using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'Invitation has expired'
      using errcode = '22023';
  end if;

  if v_invitation.email <> v_auth_email then
    raise exception 'This invitation was sent to a different email address'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = v_invitation.workspace_id
      and wm.user_id = p_accepter_user_id
      and wm.status = 'active'
  ) then
    return v_invitation.workspace_id;
  end if;

  if exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = v_invitation.workspace_id
      and wm.user_id = p_accepter_user_id
  ) then
    raise exception 'Membership already exists for this workspace'
      using errcode = '23505';
  end if;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  )
  values (
    v_invitation.workspace_id,
    p_accepter_user_id,
    v_invitation.requested_role,
    'active',
    v_invitation.invited_by,
    now()
  );

  update public.workspace_invitations wi
  set accepted_at = now()
  where wi.id = v_invitation.id;

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_invitation.workspace_id,
    p_accepter_user_id,
    'invitation.accepted',
    'workspace_invitation',
    v_invitation.id,
    jsonb_build_object(
      'requested_role', v_invitation.requested_role
    )
  );

  return v_invitation.workspace_id;
end;
$$;

revoke all on function public.accept_workspace_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.accept_workspace_invitation(text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Privilege summary (no new table grants; no new RLS policies)
-- ---------------------------------------------------------------------------
-- BROWSER (authenticated) EXECUTE ONLY:
--   list_workspace_invitations(uuid)
--   revoke_workspace_invitation(uuid, uuid)
--
-- SERVER (service_role) EXECUTE ONLY:
--   create_workspace_invitation(uuid, text, workspace_role, uuid)
--   accept_workspace_invitation(text, uuid)
--
-- Explicit REVOKE from authenticated on create/accept prevents React/browser
-- supabase.rpc(...) even if application code regresses.
--
-- Internal helpers (_*) remain revoked from PUBLIC and are not granted to
-- authenticated, anon, or service_role (callable only from other definer funcs).
