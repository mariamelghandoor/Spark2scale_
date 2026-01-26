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
        const response = await apiClient.get<FullUserProfileResponse>(`/api/users/get-profile/${userId}`);
        return response.data;
    },

    updateProfile: async (userId: string, formData: FormData) => {
        // We let the browser set the Content-Type header for FormData automatically 
        // (usually includes the boundary), or explicitly set it if your client requires.
        const response = await apiClient.put<{ avatarUrl: string }>(`/api/users/update-profile/${userId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    deleteProfile: async (userId: string) => {
        await apiClient.delete(`/api/users/delete-profile/${userId}`);
    }
};