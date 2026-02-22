-- 1. Delete rows with NULL startup_id (Broken records)
DELETE FROM public.startup_contributors
WHERE startup_id IS NULL;

-- 2. Enforce NOT NULL constraint on startup_id
ALTER TABLE public.startup_contributors
ALTER COLUMN startup_id SET NOT NULL;

-- 3. Verify Constraints
COMMENT ON COLUMN public.startup_contributors.startup_id IS 'Cannot be NULL. Links to public.startups(sid).';
