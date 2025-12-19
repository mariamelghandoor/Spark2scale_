import apiClient from '@/lib/apiClient';

export interface CreateStartupDto {
    startupname: string;
    field: string | null;
    idea_description?: string | null;
    region?: string | null;
    startup_stage?: string | null;
    founder_id?: string | null;
}

export interface StartupResponse {
    sid: string;
    startupname: string;
    field: string;
    idea_description: string;
    region: string;
    startup_stage: string;
    created_at: string;
    founder_id: string;

    total_likes: number;
    progress_count: number;
    progress_has_gap: boolean;
}

export const startupService = {
    create: async (data: CreateStartupDto) => {
        const response = await apiClient.post<StartupResponse>('/api/Startups/add', data);
        return response.data;
    },

    getByFounder: async (founderId: string) => {
        const response = await apiClient.get<StartupResponse[]>(`/api/Startups/dashboard?founderId=${founderId}`);
        return response.data;
    }
};