-- Create startup_contributors table if it doesn't exist
create table if not exists public.startup_contributors (
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

-- Founders can view their startup's contributors
create policy "Founders can view contributors"
on public.startup_contributors for select
using (
  exists (
    select 1 from public.startups 
    where sid = startup_id and founder_id = auth.uid()
  )
);

-- Contributors can view their own entries (and thus see which startups they belong to)
create policy "Contributors can view own entries"
on public.startup_contributors for select
using (
  user_id = auth.uid()
);

-- Founders can insert contributors (or system can via logic)
-- Actually, typically inserts happen via backend logic (service role) or founder invites.
-- If backend uses service key, RLS is bypassed. If user token, we need policy.
create policy "Founders can manage contributors"
on public.startup_contributors for all
using (
  exists (
    select 1 from public.startups 
    where sid = startup_id and founder_id = auth.uid()
  )
);

-- Allow users to insert themselves if they have a valid invite (handled by backend logic usually)
-- For now, we assume backend handles inserts.

-- Enable read for authenticated users might be needed for "View Team" features
create policy "Authenticated users can view contributors"
on public.startup_contributors for select
using (
  auth.role() = 'authenticated'
);
