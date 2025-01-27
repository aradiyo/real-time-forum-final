const API_BASE = '/api';

export const ApiService = {
    // Auth
    login: async(credentials) => {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return handleResponse(response);
    },

    register: async(userData) => {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return handleResponse(response);
    },

    logout: async() => {
        const response = await fetch(`${API_BASE}/logout`, { method: 'POST' });
        return handleResponse(response);
    },

    // Posts
    getPosts: async() => {
        const response = await fetch(`${API_BASE}/posts`);
        return handleResponse(response);
    },

    createPost: async(postData) => {
        const response = await fetch(`${API_BASE}/posts/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        return handleResponse(response);
    },

    // Messages
    getMessages: async(userId) => {
        const response = await fetch(`${API_BASE}/messages?userId=${userId}`);
        return handleResponse(response);
    }
};

function handleResponse(response) {
    return response.ok ? response.json() : Promise.reject(response.statusText);
}