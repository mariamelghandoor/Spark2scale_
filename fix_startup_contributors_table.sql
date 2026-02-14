-- Fix startup_contributors table to be compatible with Supabase C# BaseModel
-- BaseModel expects an 'id' column and 'created_at' column

BEGIN;

-- 1. Create a backup of existing data if any (just in case)
CREATE TEMP TABLE startup_contributors_backup AS SELECT * FROM public.startup_contributors;

-- 2. Drop the existing table (cascade will remove policies/FKs depending on it, be careful)
-- Better: Add columns if they don't exist.
-- But since we suspect PK issues, let's try to ALTER first.

DO $$ 
BEGIN 
    -- Add ID column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'startup_contributors' AND column_name = 'id') THEN
        ALTER TABLE public.startup_contributors ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'startup_contributors' AND column_name = 'created_at') THEN
        ALTER TABLE public.startup_contributors ADD COLUMN created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;

    -- Ensure contributor_id + startup_id uniqueness
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'startup_contributors_unique_membership') THEN
        ALTER TABLE public.startup_contributors ADD CONSTRAINT startup_contributors_unique_membership UNIQUE (startup_id, contributor_id);
    END IF;

END $$;

-- 3. Verify RLS Policies (Re-apply if needed, usually ALTER preserves them unless dropped)
-- Ensure policies exist (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startup_contributors' AND policyname = 'Users can add themselves as contributors') THEN
        create policy "Users can add themselves as contributors" on public.startup_contributors for insert with check (auth.uid() = contributor_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startup_contributors' AND policyname = 'Users can view their own contributor record') THEN
        create policy "Users can view their own contributor record" on public.startup_contributors for select using (auth.uid() = contributor_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startup_contributors' AND policyname = 'Founders can view contributors') THEN
        create policy "Founders can view contributors" on public.startup_contributors for select using (exists (select 1 from public.startups where sid = startup_id and founder_id = auth.uid()));
    END IF;
END $$;

COMMIT;
