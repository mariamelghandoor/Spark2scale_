-- Drop the table if it exists to ensure a clean slate with correct columns
drop table if exists public.startup_contributors cascade;

-- Recreate the table with the correct schema
create table public.startup_contributors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  startup_id uuid not null references public.startups(sid),
  role text default 'Contributor',
  invited_by uuid references auth.users(id),
  invited_at timestamptz default timezone('utc'::text, now()),
  created_at timestamptz default timezone('utc'::text, now()),
  
  -- Prevent duplicate entries
  unique(user_id, startup_id)
);

-- Comments
comment on table public.startup_contributors is 'Links users to startups as contributors with role information.';

-- Enable RLS
alter table public.startup_contributors enable row level security;

-- Policies

create policy "Founders can view contributors"
on public.startup_contributors for select
using (
  exists (
    select 1 from public.startups 
    where sid = startup_id and founder_id = auth.uid()
  )
);

create policy "Contributors can view own entries"
on public.startup_contributors for select
using (
  user_id = auth.uid()
);

create policy "Founders can manage contributors"
on public.startup_contributors for all
using (
  exists (
    select 1 from public.startups 
    where sid = startup_id and founder_id = auth.uid()
  )
);

create policy "Authenticated users can view contributors"
on public.startup_contributors for select
using (
  auth.role() = 'authenticated'
);
