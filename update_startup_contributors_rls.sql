-- Enable RLS on startup_contributors if not already
alter table public.startup_contributors enable row level security;

-- Policy: Allow users to insert their own contributor record
-- This is necessary for the AuthController.VerifyEmail to work, 
-- as it executes with the user's session.
create policy "Users can add themselves as contributors"
on public.startup_contributors for insert
with check (
  auth.uid() = contributor_id
);

-- Policy: Allow users to view their own contributor record
create policy "Users can view their own contributor record"
on public.startup_contributors for select
using (
  auth.uid() = contributor_id
);

-- Policy: Allow founders to view contributors for their startups
create policy "Founders can view contributors"
on public.startup_contributors for select
using (
  exists (
    select 1 from public.startups 
    where sid = startup_id and founder_id = auth.uid()
  )
);
