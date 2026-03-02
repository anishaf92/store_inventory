import axios from 'axios';

const api = axios.create({
    // In Vercel, set VITE_API_BASE_URL to your backend URL (e.g. https://backend.example.com/api)
    // Locally it falls back to the Vite proxy /api.
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.accessToken) {
            config.headers.Authorization = `Bearer ${user.accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
