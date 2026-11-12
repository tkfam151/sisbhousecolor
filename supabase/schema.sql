-- =============================================================================
--  SISB House Color Leaderboard — Supabase schema
--  Idempotent: safe to run (and re-run) in the Supabase SQL Editor.
--
--  Security model
--  --------------
--  * The browser only ever holds the public `anon` key.
--  * `houses`, `point_logs` and `term_archives` are publicly readable (and
--    streamed over Realtime). Nothing is writable directly by `anon`.
--  * `app_config`, `teachers` and `audit_logs` are not readable at all from the
--    browser; password hashes never leave the database.
--  * Every write goes through a SECURITY DEFINER RPC that re-verifies the
--    caller's credentials (bcrypt via pgcrypto) on every call.
--  * `audit_logs` is append-only (UPDATE / DELETE / TRUNCATE are blocked by triggers).
-- =============================================================================

create extension if not exists pgcrypto;

-- On Supabase pgcrypto lives in the `extensions` schema; on plain Postgres in `public`.
set search_path = public, extensions;

-- -----------------------------------------------------------------------------
--  Tables
-- -----------------------------------------------------------------------------

create table if not exists public.houses (
  id          text primary key,
  name        text not null,
  color       text not null,
  sort_order  int  not null,
  points      int  not null default 0
);

create table if not exists public.app_config (
  id                             int primary key check (id = 1),
  general_admin_hash             text not null,
  super_admin_hash               text not null,
  allow_teacher_password_change  boolean not null default false,
  freeze_leaderboard             boolean not null default false,
  frozen_snapshot                jsonb,
  updated_at                     timestamptz default now()
);

create table if not exists public.teachers (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  username       text unique not null,
  password_hash  text not null,
  active         boolean not null default true,
  created_at     timestamptz default now()
);

create table if not exists public.point_logs (
  id          uuid primary key default gen_random_uuid(),
  house_id    text references public.houses(id),
  house_name  text not null,
  points      int  not null,
  category    text not null default 'Spirit',
  reason      text,
  awarded_by  text not null,
  created_at  timestamptz default now()
);

-- Stable identity of whoever created the row ('super_admin', 'general_admin' or
-- 'teacher:<uuid>'), so "undo" works even if two teachers share a display name.
alter table public.point_logs add column if not exists actor_key text;

create index if not exists point_logs_created_at_idx on public.point_logs (created_at desc);
create index if not exists point_logs_house_id_idx   on public.point_logs (house_id);

create table if not exists public.term_archives (
  id                 uuid primary key default gen_random_uuid(),
  term_name          text not null,
  winner_house_id    text not null,
  winner_house_name  text not null,
  standings          jsonb not null,
  archived_by        text not null,
  archived_at        timestamptz default now()
);

create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor        text not null,
  action_type  text not null,
  details      text not null,
  created_at   timestamptz default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- -----------------------------------------------------------------------------
--  Seed data
-- -----------------------------------------------------------------------------

insert into public.houses (id, name, color, sort_order, points) values
  ('red-leopards',    'Red Leopards',    '#DC2626', 1, 0),
  ('orange-tigers',   'Orange Tigers',   '#EA580C', 2, 0),
  ('yellow-cheetahs', 'Yellow Cheetahs', '#CA8A04', 3, 0),
  ('green-panthers',  'Green Panthers',  '#16A34A', 4, 0),
  ('blue-lynxes',     'Blue Lynxes',     '#2563EB', 5, 0)
on conflict (id) do update
  set name = excluded.name,
      color = excluded.color,
      sort_order = excluded.sort_order;   -- points are never touched on re-run

insert into public.app_config (id, general_admin_hash, super_admin_hash)
values (
  1,
  crypt('sisbhousecolor2026', gen_salt('bf')),
  crypt('sisbadmin', gen_salt('bf'))
)
on conflict (id) do nothing;            -- never overwrite changed passwords on re-run

-- -----------------------------------------------------------------------------
--  Append-only audit log
-- -----------------------------------------------------------------------------

create or replace function public._audit_logs_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only; % is not allowed', tg_op;
end;
$$;

drop trigger if exists audit_logs_no_update_delete on public.audit_logs;
create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function public._audit_logs_immutable();

drop trigger if exists audit_logs_no_truncate on public.audit_logs;
create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public._audit_logs_immutable();

-- -----------------------------------------------------------------------------
--  Realtime
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['houses', 'point_logs', 'term_archives'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
--  Row Level Security & privileges
-- -----------------------------------------------------------------------------

alter table public.houses        enable row level security;
alter table public.app_config    enable row level security;
alter table public.teachers      enable row level security;
alter table public.point_logs    enable row level security;
alter table public.term_archives enable row level security;
alter table public.audit_logs    enable row level security;

-- Public read access (leaderboard + realtime)
drop policy if exists "Public read houses" on public.houses;
create policy "Public read houses" on public.houses
  for select to anon, authenticated using (true);

drop policy if exists "Public read point_logs" on public.point_logs;
create policy "Public read point_logs" on public.point_logs
  for select to anon, authenticated using (true);

drop policy if exists "Public read term_archives" on public.term_archives;
create policy "Public read term_archives" on public.term_archives
  for select to anon, authenticated using (true);

-- No policies at all on app_config / teachers / audit_logs => RLS denies every
-- direct access from anon/authenticated. Belt and braces: revoke privileges too.
revoke all on table public.app_config, public.teachers, public.audit_logs from anon, authenticated;

-- Nobody but the SECURITY DEFINER functions may write.
revoke insert, update, delete, truncate, references, trigger
  on table public.houses, public.point_logs, public.term_archives
  from anon, authenticated;
grant select on table public.houses, public.point_logs, public.term_archives to anon, authenticated;

-- -----------------------------------------------------------------------------
--  Internal helpers (not callable from the browser)
-- -----------------------------------------------------------------------------

-- Resolves {role, username, password} credentials to an identity or raises.
create or replace function public._resolve_auth(p_auth jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role     text := coalesce(p_auth ->> 'role', '');
  v_password text := coalesce(p_auth ->> 'password', '');
  v_username text := lower(trim(coalesce(p_auth ->> 'username', '')));
  v_cfg      public.app_config%rowtype;
  v_teacher  public.teachers%rowtype;
begin
  if v_password = '' then
    raise exception 'Invalid credentials' using errcode = '28P01';
  end if;

  select * into v_cfg from public.app_config where id = 1;

  if v_role = 'super_admin' then
    if v_cfg.super_admin_hash = crypt(v_password, v_cfg.super_admin_hash) then
      return jsonb_build_object('role', 'super_admin', 'display_name', 'Super Admin (sisbadmin)',
                                'teacher_id', null, 'actor_key', 'super_admin');
    end if;
  elsif v_role = 'general_admin' then
    if v_cfg.general_admin_hash = crypt(v_password, v_cfg.general_admin_hash) then
      return jsonb_build_object('role', 'general_admin', 'display_name', 'General Admin',
                                'teacher_id', null, 'actor_key', 'general_admin');
    end if;
  elsif v_role = 'teacher' then
    select * into v_teacher from public.teachers where username = v_username;
    if found and v_teacher.active and v_teacher.password_hash = crypt(v_password, v_teacher.password_hash) then
      return jsonb_build_object('role', 'teacher', 'display_name', v_teacher.full_name,
                                'teacher_id', v_teacher.id, 'actor_key', 'teacher:' || v_teacher.id::text);
    end if;
  end if;

  raise exception 'Invalid credentials or account deactivated. Please log in again.' using errcode = '28P01';
end;
$$;

create or replace function public._require_admin(p_auth jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_who jsonb := public._resolve_auth(p_auth);
begin
  if v_who ->> 'role' not in ('super_admin', 'general_admin') then
    raise exception 'Not authorized: admin access required' using errcode = '42501';
  end if;
  return v_who;
end;
$$;

create or replace function public._require_super(p_super_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  select super_admin_hash into v_hash from public.app_config where id = 1;
  if coalesce(p_super_password, '') = '' or v_hash is null or v_hash <> crypt(p_super_password, v_hash) then
    raise exception 'Invalid Super Admin password' using errcode = '28P01';
  end if;
end;
$$;

create or replace function public._audit(p_actor text, p_action text, p_details text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.audit_logs (actor, action_type, details) values (p_actor, p_action, p_details);
$$;

create or replace function public._validate_new_teacher(p_full_name text, p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if coalesce(trim(p_full_name), '') = '' then
    return 'Full name is required';
  end if;
  if length(trim(p_full_name)) > 120 then
    return 'Full name is too long (max 120 characters)';
  end if;
  if lower(trim(coalesce(p_username, ''))) !~ '^[a-z0-9._-]{3,40}$' then
    return 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    return 'Password must be at least 6 characters';
  end if;
  if exists (select 1 from public.teachers where username = lower(trim(p_username))) then
    return format('Username "%s" already exists', lower(trim(p_username)));
  end if;
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
--  Public RPCs
-- -----------------------------------------------------------------------------

create or replace function public.get_public_state()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'houses', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id, 'name', h.name, 'color', h.color,
               'sort_order', h.sort_order, 'points', h.points)
             order by h.sort_order)
      from public.houses h), '[]'::jsonb),
    'freeze_leaderboard', c.freeze_leaderboard,
    'frozen_snapshot', c.frozen_snapshot,
    'allow_teacher_password_change', c.allow_teacher_password_change
  )
  from public.app_config c
  where c.id = 1;
$$;

create or replace function public.verify_login(p_login_type text, p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cfg     public.app_config%rowtype;
  v_teacher public.teachers%rowtype;
  v_allow   boolean;
begin
  select * into v_cfg from public.app_config where id = 1;
  v_allow := coalesce(v_cfg.allow_teacher_password_change, false);

  if coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'Please enter a password',
                              'allow_teacher_password_change', v_allow);
  end if;

  if p_login_type = 'admin' then
    if v_cfg.super_admin_hash = crypt(p_password, v_cfg.super_admin_hash) then
      perform public._audit('Super Admin (sisbadmin)', 'LOGIN', 'Super Admin logged in');
      return jsonb_build_object('success', true, 'role', 'super_admin',
                                'display_name', 'Super Admin (sisbadmin)', 'teacher_id', null,
                                'allow_teacher_password_change', v_allow);
    elsif v_cfg.general_admin_hash = crypt(p_password, v_cfg.general_admin_hash) then
      perform public._audit('General Admin', 'LOGIN', 'General Admin logged in');
      return jsonb_build_object('success', true, 'role', 'general_admin',
                                'display_name', 'General Admin', 'teacher_id', null,
                                'allow_teacher_password_change', v_allow);
    end if;
    return jsonb_build_object('success', false, 'error', 'Incorrect admin password',
                              'allow_teacher_password_change', v_allow);
  elsif p_login_type = 'teacher' then
    select * into v_teacher from public.teachers where username = lower(trim(coalesce(p_username, '')));
    if not found or v_teacher.password_hash <> crypt(p_password, v_teacher.password_hash) then
      return jsonb_build_object('success', false, 'error', 'Incorrect username or password',
                                'allow_teacher_password_change', v_allow);
    end if;
    if not v_teacher.active then
      return jsonb_build_object('success', false,
                                'error', 'This account has been deactivated. Please contact the Super Admin.',
                                'allow_teacher_password_change', v_allow);
    end if;
    perform public._audit(v_teacher.full_name, 'LOGIN', format('Teacher "%s" logged in', v_teacher.username));
    return jsonb_build_object('success', true, 'role', 'teacher',
                              'display_name', v_teacher.full_name, 'teacher_id', v_teacher.id,
                              'allow_teacher_password_change', v_allow);
  end if;

  return jsonb_build_object('success', false, 'error', 'Unknown login type',
                            'allow_teacher_password_change', v_allow);
end;
$$;

create or replace function public.award_points(
  p_auth jsonb, p_house_id text, p_points int, p_category text, p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_who      jsonb := public._resolve_auth(p_auth);
  v_category text  := coalesce(nullif(trim(p_category), ''), 'Spirit');
  v_reason   text  := nullif(left(trim(coalesce(p_reason, '')), 300), '');
  v_house    public.houses%rowtype;
  v_log      public.point_logs%rowtype;
begin
  if p_points is null or p_points = 0 then
    raise exception 'Points must be a non-zero whole number';
  end if;
  if abs(p_points) > 100000 then
    raise exception 'Points must be between -100000 and 100000';
  end if;
  if v_who ->> 'role' = 'teacher' and p_points <= 0 then
    raise exception 'Teachers can only award positive points';
  end if;
  if v_category not in ('Sports', 'Academics', 'Spirit', 'Other') then
    raise exception 'Invalid category "%"', v_category;
  end if;

  update public.houses set points = points + p_points
  where id = p_house_id
  returning * into v_house;
  if not found then
    raise exception 'Unknown house';
  end if;

  insert into public.point_logs (house_id, house_name, points, category, reason, awarded_by, actor_key)
  values (v_house.id, v_house.name, p_points, v_category, v_reason, v_who ->> 'display_name', v_who ->> 'actor_key')
  returning * into v_log;

  if p_points < 0 then
    perform public._audit(v_who ->> 'display_name', 'POINTS_DEDUCTED',
      format('Deducted %s pts from %s (%s%s)', abs(p_points), v_house.name, v_category,
             coalesce(': ' || v_reason, '')));
  end if;

  return jsonb_build_object('log_id', v_log.id, 'created_at', v_log.created_at,
                            'house_name', v_house.name, 'points', v_log.points,
                            'house_points', v_house.points);
end;
$$;

create or replace function public.undo_last_award(p_auth jsonb, p_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_who jsonb := public._resolve_auth(p_auth);
  v_log public.point_logs%rowtype;
begin
  select * into v_log from public.point_logs where id = p_log_id for update;
  if not found then
    raise exception 'That award was not found — it may already have been undone or deleted.';
  end if;
  if v_log.actor_key is distinct from (v_who ->> 'actor_key') then
    raise exception 'You can only undo your own awards';
  end if;
  if not (v_log.created_at > now() - interval '60 seconds') then
    raise exception 'The 60-second undo window has expired. Ask an admin to delete the entry.';
  end if;

  delete from public.point_logs where id = p_log_id;
  update public.houses set points = points - v_log.points where id = v_log.house_id;

  perform public._audit(v_who ->> 'display_name', 'UNDO_AWARD',
    format('Undid %s%s pts for %s (%s%s)', case when v_log.points > 0 then '+' else '' end,
           v_log.points, v_log.house_name, v_log.category, coalesce(': ' || v_log.reason, '')));

  return jsonb_build_object('success', true, 'house_name', v_log.house_name, 'points', v_log.points);
end;
$$;

create or replace function public.admin_delete_log(p_auth jsonb, p_log_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_who jsonb := public._require_admin(p_auth);
  v_log public.point_logs%rowtype;
begin
  select * into v_log from public.point_logs where id = p_log_id for update;
  if not found then
    raise exception 'Log entry not found — it may already have been deleted.';
  end if;

  delete from public.point_logs where id = p_log_id;
  update public.houses set points = points - v_log.points where id = v_log.house_id;

  perform public._audit(v_who ->> 'display_name', 'DELETE_LOG',
    format('Deleted %s%s pts for %s (%s%s) awarded by %s at %s',
           case when v_log.points > 0 then '+' else '' end, v_log.points, v_log.house_name,
           v_log.category, coalesce(': ' || v_log.reason, ''), v_log.awarded_by, v_log.created_at));

  return jsonb_build_object('success', true, 'house_name', v_log.house_name, 'points', v_log.points);
end;
$$;

create or replace function public.admin_toggle_freeze(p_auth jsonb, p_freeze boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_who jsonb := public._require_admin(p_auth);
  v_cfg public.app_config%rowtype;
begin
  select * into v_cfg from public.app_config where id = 1 for update;

  if coalesce(p_freeze, false) then
    if not v_cfg.freeze_leaderboard or v_cfg.frozen_snapshot is null then
      update public.app_config
         set freeze_leaderboard = true,
             frozen_snapshot = jsonb_build_object(
               'frozen_at', now(),
               'houses', (select jsonb_agg(jsonb_build_object(
                                   'id', h.id, 'name', h.name, 'color', h.color,
                                   'sort_order', h.sort_order, 'points', h.points)
                                 order by h.sort_order)
                          from public.houses h)),
             updated_at = now()
       where id = 1;
    end if;
    perform public._audit(v_who ->> 'display_name', 'FREEZE_ON',
                          'Mystery / Freeze Mode enabled — public scores frozen');
  else
    update public.app_config
       set freeze_leaderboard = false, frozen_snapshot = null, updated_at = now()
     where id = 1;
    perform public._audit(v_who ->> 'display_name', 'FREEZE_OFF',
                          'Mystery / Freeze Mode disabled — scores revealed');
  end if;

  -- app_config is private (not in the Realtime publication). Touch the public
  -- houses table so every connected screen receives a change event and refetches
  -- get_public_state() immediately.
  update public.houses set points = points where id is not null;

  select * into v_cfg from public.app_config where id = 1;
  return jsonb_build_object('freeze_leaderboard', v_cfg.freeze_leaderboard,
                            'frozen_snapshot', v_cfg.frozen_snapshot);
end;
$$;

-- -----------------------------------------------------------------------------
--  Super Admin (sisbadmin) RPCs
-- -----------------------------------------------------------------------------

create or replace function public.super_admin_get_dashboard_data(p_super_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public._require_super(p_super_password);
  return jsonb_build_object(
    'teachers', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'full_name', t.full_name, 'username', t.username,
                                          'active', t.active, 'created_at', t.created_at)
                       order by lower(t.full_name))
      from public.teachers t), '[]'::jsonb),
    'audit_logs', coalesce((
      select jsonb_agg(row_to_json(a)::jsonb order by a.created_at desc)
      from (select id, actor, action_type, details, created_at
            from public.audit_logs order by created_at desc limit 1000) a), '[]'::jsonb),
    'allow_teacher_password_change', (select allow_teacher_password_change from public.app_config where id = 1),
    'freeze_leaderboard', (select freeze_leaderboard from public.app_config where id = 1)
  );
end;
$$;

create or replace function public.super_admin_create_teacher(
  p_super_password text, p_full_name text, p_username text, p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_error   text;
  v_teacher public.teachers%rowtype;
begin
  perform public._require_super(p_super_password);
  v_error := public._validate_new_teacher(p_full_name, p_username, p_password);
  if v_error is not null then
    raise exception '%', v_error;
  end if;

  insert into public.teachers (full_name, username, password_hash)
  values (trim(p_full_name), lower(trim(p_username)), crypt(p_password, gen_salt('bf')))
  returning * into v_teacher;

  perform public._audit('Super Admin (sisbadmin)', 'TEACHER_CREATED',
    format('Created teacher "%s" (%s)', v_teacher.full_name, v_teacher.username));

  return jsonb_build_object('id', v_teacher.id, 'full_name', v_teacher.full_name, 'username', v_teacher.username,
                            'active', v_teacher.active, 'created_at', v_teacher.created_at);
exception
  when unique_violation then
    raise exception 'Username "%" already exists', lower(trim(p_username));
end;
$$;

create or replace function public.super_admin_bulk_create_teachers(p_super_password text, p_teachers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_item     jsonb;
  v_idx      bigint;
  v_line     int;
  v_name     text;
  v_user     text;
  v_pass     text;
  v_error    text;
  v_results  jsonb := '[]'::jsonb;
  v_created  int := 0;
  v_failed   int := 0;
begin
  perform public._require_super(p_super_password);
  if p_teachers is null or jsonb_typeof(p_teachers) <> 'array' or jsonb_array_length(p_teachers) = 0 then
    raise exception 'No teachers to import';
  end if;
  if jsonb_array_length(p_teachers) > 500 then
    raise exception 'Please import at most 500 teachers at a time';
  end if;

  for v_item, v_idx in select e.value, e.ordinality from jsonb_array_elements(p_teachers) with ordinality as e loop
    v_line := coalesce((v_item ->> 'line')::int, v_idx::int);
    v_name := trim(coalesce(v_item ->> 'full_name', ''));
    v_user := lower(trim(coalesce(v_item ->> 'username', '')));
    v_pass := coalesce(v_item ->> 'password', '');
    v_error := public._validate_new_teacher(v_name, v_user, v_pass);

    if v_error is null then
      begin
        insert into public.teachers (full_name, username, password_hash)
        values (v_name, v_user, crypt(v_pass, gen_salt('bf')));
        v_created := v_created + 1;
        v_results := v_results || jsonb_build_object('line', v_line, 'username', v_user, 'full_name', v_name,
                                                     'status', 'created', 'message', 'Created');
        continue;
      exception
        when unique_violation then
          v_error := format('Username "%s" already exists', v_user);
      end;
    end if;

    v_failed := v_failed + 1;
    v_results := v_results || jsonb_build_object('line', v_line, 'username', v_user, 'full_name', v_name,
                                                 'status', 'error', 'message', v_error);
  end loop;

  perform public._audit('Super Admin (sisbadmin)', 'TEACHERS_BULK_IMPORT',
    format('Bulk import: %s created, %s failed', v_created, v_failed));

  return jsonb_build_object('created', v_created, 'failed', v_failed, 'results', v_results);
end;
$$;

create or replace function public.super_admin_manage_teacher(
  p_super_password text, p_teacher_id uuid, p_active boolean, p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_teacher public.teachers%rowtype;
  v_changes text[] := array[]::text[];
begin
  perform public._require_super(p_super_password);
  select * into v_teacher from public.teachers where id = p_teacher_id for update;
  if not found then
    raise exception 'Teacher not found';
  end if;

  if p_active is not null and p_active <> v_teacher.active then
    update public.teachers set active = p_active where id = p_teacher_id;
    v_changes := v_changes || case when p_active then 'activated' else 'deactivated' end;
  end if;

  if coalesce(p_new_password, '') <> '' then
    if length(p_new_password) < 6 then
      raise exception 'Password must be at least 6 characters';
    end if;
    update public.teachers set password_hash = crypt(p_new_password, gen_salt('bf')) where id = p_teacher_id;
    v_changes := v_changes || 'password reset'::text;
  end if;

  if array_length(v_changes, 1) > 0 then
    perform public._audit('Super Admin (sisbadmin)', 'TEACHER_UPDATED',
      format('Teacher "%s" (%s): %s', v_teacher.full_name, v_teacher.username, array_to_string(v_changes, ', ')));
  end if;

  select * into v_teacher from public.teachers where id = p_teacher_id;
  return jsonb_build_object('id', v_teacher.id, 'full_name', v_teacher.full_name, 'username', v_teacher.username,
                            'active', v_teacher.active, 'created_at', v_teacher.created_at);
end;
$$;

create or replace function public.super_admin_update_security(
  p_super_password text, p_new_general_password text, p_allow_teacher_self_change boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cfg     public.app_config%rowtype;
  v_changes text[] := array[]::text[];
begin
  perform public._require_super(p_super_password);
  select * into v_cfg from public.app_config where id = 1 for update;

  if coalesce(p_new_general_password, '') <> '' then
    if length(p_new_general_password) < 6 then
      raise exception 'General Admin password must be at least 6 characters';
    end if;
    if v_cfg.super_admin_hash = crypt(p_new_general_password, v_cfg.super_admin_hash) then
      raise exception 'General Admin password must differ from the Super Admin password';
    end if;
    update public.app_config
       set general_admin_hash = crypt(p_new_general_password, gen_salt('bf')), updated_at = now()
     where id = 1;
    v_changes := v_changes || 'General Admin password changed'::text;
  end if;

  if p_allow_teacher_self_change is not null
     and p_allow_teacher_self_change <> v_cfg.allow_teacher_password_change then
    update public.app_config
       set allow_teacher_password_change = p_allow_teacher_self_change, updated_at = now()
     where id = 1;
    v_changes := v_changes || format('Teacher self-password change %s',
                                     case when p_allow_teacher_self_change then 'enabled' else 'disabled' end);
    -- Nudge realtime listeners (teacher dashboards) to refetch public state.
    update public.houses set points = points where id is not null;
  end if;

  if array_length(v_changes, 1) > 0 then
    perform public._audit('Super Admin (sisbadmin)', 'SECURITY_UPDATED', array_to_string(v_changes, '; '));
  end if;

  return jsonb_build_object(
    'success', true,
    'allow_teacher_password_change', (select allow_teacher_password_change from public.app_config where id = 1),
    'changes', to_jsonb(v_changes));
end;
$$;

create or replace function public.super_admin_archive_term(p_super_password text, p_term_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name      text := trim(coalesce(p_term_name, ''));
  v_standings jsonb;
  v_winner    jsonb;
  v_archive   public.term_archives%rowtype;
begin
  perform public._require_super(p_super_password);
  if v_name = '' then
    raise exception 'Term / event name is required';
  end if;
  if length(v_name) > 120 then
    raise exception 'Term name is too long (max 120 characters)';
  end if;

  -- Lock the houses while we snapshot + reset.
  perform 1 from public.houses for update;

  select jsonb_agg(jsonb_build_object('rank', r.rank, 'house_id', r.id, 'house_name', r.name,
                                      'color', r.color, 'points', r.points) order by r.rank)
    into v_standings
    from (select h.*, row_number() over (order by h.points desc, h.sort_order asc) as rank
          from public.houses h) r;

  v_winner := v_standings -> 0;

  insert into public.term_archives (term_name, winner_house_id, winner_house_name, standings, archived_by)
  values (v_name, v_winner ->> 'house_id', v_winner ->> 'house_name', v_standings, 'Super Admin (sisbadmin)')
  returning * into v_archive;

  update public.houses set points = 0 where id is not null;
  update public.app_config
     set freeze_leaderboard = false, frozen_snapshot = null, updated_at = now()
   where id = 1;

  perform public._audit('Super Admin (sisbadmin)', 'TERM_ARCHIVED',
    format('Archived "%s" — champion %s (%s pts). Standings: %s. All houses reset to 0.',
           v_name, v_winner ->> 'house_name', v_winner ->> 'points',
           (select string_agg((s ->> 'house_name') || ' ' || (s ->> 'points'), ', ' order by (s ->> 'rank')::int)
              from jsonb_array_elements(v_standings) s)));

  return to_jsonb(v_archive);
end;
$$;

create or replace function public.super_admin_reset_all(p_super_password text, p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_logs     int;
  v_archives int;
begin
  perform public._require_super(p_super_password);
  if coalesce(p_confirm, '') <> 'RESET' then
    raise exception 'Type RESET to confirm';
  end if;

  perform 1 from public.houses for update;

  delete from public.point_logs where id is not null;
  get diagnostics v_logs = row_count;
  delete from public.term_archives where id is not null;
  get diagnostics v_archives = row_count;

  update public.houses set points = 0 where id is not null;
  update public.app_config
     set freeze_leaderboard = false, frozen_snapshot = null, updated_at = now()
   where id = 1;

  perform public._audit('Super Admin (sisbadmin)', 'FULL_RESET',
    format('Reset everything: deleted %s point logs and %s archived terms; all houses set to 0.', v_logs, v_archives));

  return jsonb_build_object('success', true, 'deleted_logs', v_logs, 'deleted_archives', v_archives);
end;
$$;

-- -----------------------------------------------------------------------------
--  Teacher self-service
-- -----------------------------------------------------------------------------

create or replace function public.teacher_change_own_password(
  p_teacher_id uuid, p_old_password text, p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_allow   boolean;
  v_teacher public.teachers%rowtype;
begin
  select allow_teacher_password_change into v_allow from public.app_config where id = 1;
  if not coalesce(v_allow, false) then
    raise exception 'Password self-service is currently disabled by the Super Admin';
  end if;

  select * into v_teacher from public.teachers where id = p_teacher_id for update;
  if not found or not v_teacher.active
     or v_teacher.password_hash <> crypt(coalesce(p_old_password, ''), v_teacher.password_hash) then
    raise exception 'Current password is incorrect';
  end if;
  if length(coalesce(p_new_password, '')) < 6 then
    raise exception 'New password must be at least 6 characters';
  end if;

  update public.teachers set password_hash = crypt(p_new_password, gen_salt('bf')) where id = p_teacher_id;
  perform public._audit(v_teacher.full_name, 'PASSWORD_CHANGED',
    format('Teacher "%s" changed their own password', v_teacher.username));

  return jsonb_build_object('success', true);
end;
$$;

-- -----------------------------------------------------------------------------
--  Function privileges
-- -----------------------------------------------------------------------------

-- Internal helpers: never callable through the API.
revoke all on function public._resolve_auth(jsonb)                    from public, anon, authenticated;
revoke all on function public._require_admin(jsonb)                   from public, anon, authenticated;
revoke all on function public._require_super(text)                    from public, anon, authenticated;
revoke all on function public._audit(text, text, text)                from public, anon, authenticated;
revoke all on function public._validate_new_teacher(text, text, text) from public, anon, authenticated;
revoke all on function public._audit_logs_immutable()                 from public, anon, authenticated;

-- Public RPC surface.
grant execute on function public.get_public_state()                                         to anon, authenticated;
grant execute on function public.verify_login(text, text, text)                             to anon, authenticated;
grant execute on function public.award_points(jsonb, text, int, text, text)                 to anon, authenticated;
grant execute on function public.undo_last_award(jsonb, uuid)                               to anon, authenticated;
grant execute on function public.admin_delete_log(jsonb, uuid)                              to anon, authenticated;
grant execute on function public.admin_toggle_freeze(jsonb, boolean)                        to anon, authenticated;
grant execute on function public.super_admin_get_dashboard_data(text)                       to anon, authenticated;
grant execute on function public.super_admin_create_teacher(text, text, text, text)         to anon, authenticated;
grant execute on function public.super_admin_bulk_create_teachers(text, jsonb)              to anon, authenticated;
grant execute on function public.super_admin_manage_teacher(text, uuid, boolean, text)      to anon, authenticated;
grant execute on function public.super_admin_update_security(text, text, boolean)           to anon, authenticated;
grant execute on function public.super_admin_archive_term(text, text)                       to anon, authenticated;
grant execute on function public.super_admin_reset_all(text, text)                          to anon, authenticated;
grant execute on function public.teacher_change_own_password(uuid, text, text)              to anon, authenticated;

-- Ask PostgREST to pick up the new / changed functions immediately.
notify pgrst, 'reload schema';
