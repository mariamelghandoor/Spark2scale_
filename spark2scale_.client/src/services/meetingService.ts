import apiClient from '@/lib/apiClient';

export interface MeetingDto {
    meeting_id: string;
    founder_id: string | null;
    investor_id: string | null;
    startup_id: string | null;
    meeting_date: string;
    meeting_time: string;
    meeting_link: string | null;
    created_at: string;
    with_whom_name: string;
    status: string; // 'pending', 'accepted', 'rejected', 'canceled'
}

export interface MeetingInsertDto {
    founder_id?: string;
    invitee_email?: string;
    meeting_date: string;
    meeting_time: string;
    meeting_link: string;
}

export const meetingService = {
    getUserMeetings: async (userId: string) => {
        const response = await apiClient.get<MeetingDto[]>(`/api/Meetings?userId=${userId}`);
        return response.data;
    },

    createMeeting: async (data: MeetingInsertDto) => {
        const response = await apiClient.post('/api/Meetings/add', data);
        return response.data;
    },

    acceptMeeting: async (id: string) => {
        await apiClient.post(`/api/Meetings/accept/${id}`);
    },

    rejectMeeting: async (id: string) => {
        await apiClient.post(`/api/Meetings/reject/${id}`);
    },

    // NEW
    cancelMeeting: async (id: string) => {
        await apiClient.post(`/api/Meetings/cancel/${id}`);
    }
};