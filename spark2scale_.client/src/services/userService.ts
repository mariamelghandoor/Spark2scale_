// spark2scale_.client/src/services/userService.ts
import apiClient from '@/lib/apiClient';

export interface UserProfileDto {
    fname: string;
    lname: string;
}

export interface UserRoleResponse {
    role: "founder" | "investor" | "guest";
}

// NEW: Interface for the full profile data structure
export interface FullUserProfileResponse {
    user: {
        fname: string;
        lname: string;
        email: string;
        phone_number: string;
        address_region: string;
    };
    avatarUrl?: string;
}

export const userService = {
    getUser: async (userId: string) => {
        const response = await apiClient.get<UserProfileDto>(`/api/Users/${userId}`);
        return response.data;
    },

    getUserRole: async (userId: string) => {
        const response = await apiClient.get<UserRoleResponse>(`/api/Users/role/${userId}`);
        return response.data;
    },

    // --- NEW PROFILE METHODS ---

    getProfile: async (userId: string) => {
        const response = await apiClient.get<FullUserProfileResponse>(`/api/Users/get-profile/${userId}`);
        return response.data;
    },

    updateProfile: async (userId: string, formData: FormData) => {
        // FIX: Removed the manual 'Content-Type' header.
        // Axios automatically sets it to 'multipart/form-data; boundary=...' when passing FormData.
        const response = await apiClient.put<{ avatarUrl: string }>(
            `/api/Users/update-profile/${userId}`,
            formData
        );
        return response.data;
    },

    deleteProfile: async (userId: string) => {
        await apiClient.delete(`/api/Users/delete-profile/${userId}`);
    }
};