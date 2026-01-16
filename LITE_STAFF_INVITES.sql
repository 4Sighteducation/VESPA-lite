-- Lite staff invite tracking for admin uploads and CSV imports
create table if not exists public.lite_staff_invites (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  invite_method text not null check (invite_method in ('manual', 'csv', 'qr')),
  invite_token uuid not null unique,
  email text not null,
  first_name text,
  last_name text,
  role_type text not null,
  role_meta jsonb not null default '{}'::jsonb,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists lite_staff_invites_establishment_idx
  on public.lite_staff_invites (establishment_id);
create index if not exists lite_staff_invites_email_idx
  on public.lite_staff_invites (email);

alter table public.lite_staff_invites enable row level security;

drop policy if exists "lite_staff_invites_admin_read" on public.lite_staff_invites;
create policy "lite_staff_invites_admin_read"
on public.lite_staff_invites
for select
using (
  exists (
    select 1
    from public.lite_staff_roles r
    where r.user_id = auth.uid()
      and r.role_type = 'super_admin'
  )
  or (
    public.lite_is_admin()
    and establishment_id = public.lite_staff_establishment_id()
  )
);

drop policy if exists "lite_staff_invites_admin_insert" on public.lite_staff_invites;
create policy "lite_staff_invites_admin_insert"
on public.lite_staff_invites
for insert
with check (
  exists (
    select 1
    from public.lite_staff_roles r
    where r.user_id = auth.uid()
      and r.role_type = 'super_admin'
  )
  or (
    public.lite_is_admin()
    and establishment_id = public.lite_staff_establishment_id()
  )
);
