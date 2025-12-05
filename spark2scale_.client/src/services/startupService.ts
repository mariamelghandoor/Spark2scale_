import apiClient from '@/lib/apiClient';

export interface CreateStartupDto {
    startupname: string;
    field: string | null;
    idea_description?: string | null;
    founder_id?: string | null;
}

export interface StartupResponse {
    sid: string;
    startupname: string;
    field: string;
    idea_description: string;
    created_at: string;
    founder_id: string;
}

export const startupService = {
    // 1. Create Startup
    create: async (data: CreateStartupDto) => {
        const response = await apiClient.post<StartupResponse>('/api/Startups/add', data);
        return response.data;
    },

    // 2. THIS IS THE MISSING FUNCTION THAT MAKES FETCH WORK
    getByFounder: async (founderId: string) => {
        // Calls the backend to get the list
        const response = await apiClient.get<StartupResponse[]>(`/api/Startups?founderId=${founderId}`);
        return response.data;
    }
};