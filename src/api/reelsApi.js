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
    if (
      response.status === 404 &&
      message === 'Not found' &&
      path.startsWith('/stock-minimums')
    ) {
      message =
        'Minimum stock API is not available. Restart the backend (npm run server) after updating the code.';
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

export const updateUserAccess = (userId, access) =>
  request(`/users/${userId}/access`, {
    method: 'PUT',
    body: JSON.stringify({ access })
  });

export const fetchReels = () => request('/reels');

/** Returns [] when no rules exist or the API route is unavailable (404). */
export const fetchStockMinimums = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/stock-minimums`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const body = await response.json();
      message = body.message || message;
    } catch (error) {
      // ignore JSON parse error
    }
    if (response.status === 401) {
      clearAuthToken();
      clearStoredUser();
    }
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const createStockMinimum = (payload) =>
  request('/stock-minimums', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateStockMinimum = (id, payload) =>
  request(`/stock-minimums/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteStockMinimum = (id) =>
  request(`/stock-minimums/${id}`, {
    method: 'DELETE'
  });

export const createReel = (reel) =>
  request('/reels', {
    method: 'POST',
    body: JSON.stringify(reel)
  });

export const createReelsBulk = (reels) =>
  request('/reels/bulk', {
    method: 'POST',
    body: JSON.stringify({ reels })
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
