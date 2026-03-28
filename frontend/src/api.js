import axios from 'axios';

const defaultApiBaseUrl = `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiBaseUrl,
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

export const getRoutes = async (params = {}) => {
  const response = await api.get('/routes', { params });
  return response.data;
};

export const getRouteById = async (routeId) => {
  const response = await api.get(`/routes/${routeId}`);
  return response.data;
};

export const createRoute = async (payload) => {
  const response = await api.post('/routes', payload);
  return response.data;
};

export const uploadRouteStepMedia = async (file) => {
  const formData = new FormData();
  formData.append('media', file);

  const response = await api.post('/routes/media', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.error || fallbackMessage;
};