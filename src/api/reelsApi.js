const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4000/api');
const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};
export const setStoredUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const clearStoredUser = () => localStorage.removeItem(USER_KEY);

const request = async (path, options = {}) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const body = await response.json();
      message = body.message || message;
    } catch (error) {
      // ignore JSON parse error and use default message
    }
    if (response.status === 401) {
      clearAuthToken();
      clearStoredUser();
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const login = (username, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

export const fetchCurrentUser = () => request('/auth/me');
export const fetchUsers = () => request('/users');
export const createUser = (payload) =>
  request('/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const fetchReels = () => request('/reels');

export const createReel = (reel) =>
  request('/reels', {
    method: 'POST',
    body: JSON.stringify(reel)
  });

export const updateReel = (id, reel) =>
  request(`/reels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(reel)
  });

export const toggleReel = (id) =>
  request(`/reels/${id}/toggle`, {
    method: 'PATCH'
  });

export const deleteReel = (id) =>
  request(`/reels/${id}`, {
    method: 'DELETE'
  });
