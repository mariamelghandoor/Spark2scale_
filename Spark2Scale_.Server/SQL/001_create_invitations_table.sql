-- Create the invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id UUID NOT NULL REFERENCES startups(sid) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Contributor',
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
    invited_by UUID REFERENCES auth.users(id), -- Assuming InvitedBy is a user ID
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT unique_startup_email_pending UNIQUE (startup_id, email, status) 
        -- Prevent multiple pending invites for the same email to the same startup
);

-- Index for faster token lookups
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
