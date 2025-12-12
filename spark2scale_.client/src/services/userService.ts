import apiClient from '@/lib/apiClient';

export interface UserProfileDto {
    fname: string;
    lname: string;
}

export const userService = {
    getUser: async (userId: string) => {
        const response = await apiClient.get<UserProfileDto>(`/api/Users/${userId}`);
        return response.data;
    }
};