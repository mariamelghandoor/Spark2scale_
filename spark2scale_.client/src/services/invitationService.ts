import apiClient from '@/lib/apiClient';

export interface InvitationResponse {
    invitationId: string;
    startupId: string;
    startupName: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
}

export interface SendInvitationRequest {
    startupId: string;
    email: string;
    role?: string;
    invitedBy?: string;
}

export interface RespondInvitationRequest {
    token: string;
    accept: boolean;
    userId: string;
}

export const invitationService = {
    send: async (data: SendInvitationRequest) => {
        const response = await apiClient.post('/api/Invitation/send', data);
        return response.data;
    },

    verify: async (token: string) => {
        const response = await apiClient.get<InvitationResponse>(`/api/Invitation/verify/${token}`);
        return response.data;
    },

    // Deprecated or alias
    validate: async (token: string) => {
        return invitationService.verify(token);
    },

    respond: async (data: RespondInvitationRequest) => {
        const response = await apiClient.post('/api/Invitation/respond', data);
        return response.data;
    }
};
