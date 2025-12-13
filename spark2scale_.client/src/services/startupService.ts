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

    // Dashboard Extra Fields
    total_likes: number;
    progress_count: number;
    progress_has_gap: boolean;
}

export const startupService = {
    create: async (data: CreateStartupDto) => {
        const response = await apiClient.post<StartupResponse>('/api/Startups/add', data);
        return response.data;
    },

    // UPDATED: Now calls the specific dashboard endpoint
    getByFounder: async (founderId: string) => {
        const response = await apiClient.get<StartupResponse[]>(`/api/Startups/dashboard?founderId=${founderId}`);
        return response.data;
    }
};