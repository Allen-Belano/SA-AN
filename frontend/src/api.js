import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

const AUTH_STORAGE_KEY = 'saan-auth-session';

export const getStoredSession = () => {
  try {
    const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
};

export const storeSession = (session) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const registerUser = async (payload) => {
  const response = await api.post('/users/register', payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post('/users/login', payload);
  return response.data;
};

export const fetchCurrentUser = async (token) => {
  const response = await api.get('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const updateCurrentUser = async (token, payload) => {
  const response = await api.put('/users/me', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.error || fallbackMessage;
};