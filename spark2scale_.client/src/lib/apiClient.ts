import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the Auth Token
apiClient.interceptors.request.use(
    (config) => {
        // Get token from localStorage (key must match AuthContext)
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;