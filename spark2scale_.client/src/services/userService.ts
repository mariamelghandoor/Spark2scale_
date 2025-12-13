import apiClient from '@/lib/apiClient';

export interface UserProfileDto {
    fname: string;
    lname: string;
}
export interface UserRoleResponse {
    role: "founder" | "investor" | "guest";
}

export const userService = {
    getUser: async (userId: string) => {
        const response = await apiClient.get<UserProfileDto>(`/api/Users/${userId}`);
        return response.data;
    },
    getUserRole: async (userId: string) => {
        const response = await apiClient.get<UserRoleResponse>(`/api/Users/role/${userId}`);
        return response.data;
    }
};