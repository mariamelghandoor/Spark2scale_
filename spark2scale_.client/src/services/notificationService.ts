import apiClient from '@/lib/apiClient';

export interface NotificationDto {
    nid: string;
    sender: string | null;
    receiver: string | null;
    topic: string;
    description: string;
    created_at: string;
    is_read: boolean;
    sender_name: string; // <-- This is the key addition
    type: string; // 'info' or 'meeting_invite'
    related_entity_id: string | null;
}

export const notificationService = {
    getByUser: async (userId: string) => {
        const response = await apiClient.get<NotificationDto[]>(`/api/Notifications?userId=${userId}`);
        return response.data;
    },

    markAsRead: async (nid: string) => {
        await apiClient.post(`/api/Notifications/read/${nid}`);
    }
};