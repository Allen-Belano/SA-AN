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

const isLocalDevSessionToken = (token) => token === 'local-dev-session';

export const registerUser = async (payload) => {
  const response = await api.post('/users/register', payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post('/users/login', payload);
  return response.data;
};

export const fetchCurrentUser = async (token) => {
  if (isLocalDevSessionToken(token)) {
    const session = getStoredSession();

    if (!session?.user) {
      throw new Error('No local user session found');
    }

    return { user: session.user };
  }

  const response = await api.get('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const updateCurrentUser = async (token, payload) => {
  if (isLocalDevSessionToken(token)) {
    const session = getStoredSession();

    if (!session?.user) {
      throw new Error('No local user session found');
    }

    const updatedUser = {
      ...session.user,
      ...payload,
    };

    storeSession({
      ...session,
      user: updatedUser,
    });

    return { user: updatedUser };
  }

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

export const getRouteRecommendations = async (userId) => {
  const response = await api.get('/routes/recommendations', {
    params: { user_id: userId },
  });

  return response.data;
};

export const getRouteById = async (routeId, params = {}) => {
  const response = await api.get(`/routes/${routeId}`, { params });
  return response.data;
};

export const getRouteLiveStatus = async (routeId) => {
  const response = await api.get(`/routes/${routeId}/live-status`);
  return response.data;
};

export const voteRoute = async (routeId, payload) => {
  const response = await api.post(`/routes/${routeId}/vote`, payload);
  return response.data;
};

export const bookmarkRoute = async (routeId, payload) => {
  const response = await api.post(`/routes/${routeId}/bookmark`, payload);
  return response.data;
};

export const reportRouteIssue = async (routeId, payload) => {
  const response = await api.post(`/routes/${routeId}/report`, payload);
  return response.data;
};

export const getSavedRoutes = async (userId) => {
  const response = await api.get('/routes/bookmarks/list', {
    params: { user_id: userId },
  });
  return response.data;
};

export const checkDuplicateRoute = async (payload) => {
  const response = await api.post('/routes/check-duplicate', payload);
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

export const getCommunityUpdates = async (params = {}) => {
  const response = await api.get('/updates', { params });
  return response.data;
};

export const reactToCommunityUpdate = async (updateId, payload) => {
  const response = await api.post(`/updates/${updateId}/reactions`, payload);
  return response.data;
};

export const getCommunityComments = async (updateId) => {
  const response = await api.get(`/updates/${updateId}/comments`);
  return response.data;
};

export const addCommunityComment = async (updateId, payload) => {
  const response = await api.post(`/updates/${updateId}/comments`, payload);
  return response.data;
};

export const createCommunityUpdate = async (payload) => {
  const response = await api.post('/updates', payload);
  return response.data;
};

export const askCommuterChatbot = async (payload) => {
  const response = await api.post('/chatbot/assist', payload);
  return response.data;
};

export const getNotifications = async (userId, unreadOnly = false) => {
  const response = await api.get('/notifications', {
    params: {
      user_id: userId,
      unread: unreadOnly,
    },
  });

  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.error || fallbackMessage;
};