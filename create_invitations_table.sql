-- Create the "invitations" table
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(sid),
  email text not null,
  role text not null default 'Contributor',
  token text not null unique,
  status text not null default 'Pending',
  invited_by uuid references auth.users(id),
  invited_at timestamptz default timezone('utc'::text, now()) not null,
  expires_at timestamptz not null
);

-- Add comments for clarity
comment on table public.invitations is 'Stores pending invitations for startup contributors.';

-- Enable Row Level Security (RLS)
alter table public.invitations enable row level security;

-- Policies

-- Founders can create invitations
-- FIX: Changed USING to WITH CHECK for INSERT policy
create policy "Founders can create invitations for their startups"
on public.invitations for insert
with check (
  auth.uid() = invited_by
);

-- Founders can view invitations for their startups
create policy "Founders can view invitations"
on public.invitations for select
using (
  exists (
    select 1 from public.startups 
    where sid = startup_id and founder_id = auth.uid()
  )
);

-- Public can view invitation by token (for validating invite link)
create policy "Enable read access for all users"
on public.invitations for select
using (true);

-- Enable update for users (accepting/rejecting)
create policy "Enable update for users"
on public.invitations for update
using (true); 
