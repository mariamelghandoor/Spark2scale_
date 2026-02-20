-- RESTORE SCRIPT to recover missing contributor links
-- This is necessary because we previously cleaned up NULL records, but if the 'Self-Healing' hadn't run, 
-- we might have removed the only link a user had.
-- This script finds 'Accepted' invitations and re-inserts the link if it's missing.

INSERT INTO public.startup_contributors (user_id, startup_id, role, invited_by, invited_at)
SELECT 
    au.id as user_id, 
    i.startup_id, 
    i.role, 
    i.invited_by,
    i.invited_at
FROM public.invitations i
JOIN auth.users au ON i.email = au.email
WHERE i.status = 'Accepted'
AND NOT EXISTS (
    SELECT 1 FROM public.startup_contributors sc 
    WHERE sc.user_id = au.id AND sc.startup_id = i.startup_id
);

-- Confirmation
SELECT count(*) as restored_links_count FROM public.startup_contributors;
