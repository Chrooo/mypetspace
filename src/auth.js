import axios from 'axios';

// Same server as the lesson (port 8000)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// every axios request will carry the login token (if there is one)
const setHeader = (token) => {
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
};
setHeader(localStorage.getItem('token')); // keeps you logged in after a page refresh

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (err) {
    return null;
  }
};

export const saveLogin = ({ token, user }) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  setHeader(token);
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setHeader(null);
};

  export const checkAvailable = async (_, value) => {
    const v = (value || '').trim();
    if (!v) return;
    let available = true;
    try {
      const { data } = await axios.get(`${API_URL}/check-identifier`, { params: { identifier: v } });
      available = data.available;
    } catch (err) {
      return;
    }
    if (!available) throw new Error('This email or phone is already registered');
  };

// where each role lands after logging in (/dashboard redirects here)
export const roleHome = (role) =>
  ({ admin: '/admin', staff: '/staff', groomer: '/groomer', customer: '/account' }[role] || '/account');

export const ROLE_LABELS = {
  admin: { label: 'Admin', color: '#EE2A7B' },
  staff: { label: 'Hotel Staff', color: '#0E969C' },
  groomer: { label: 'Groomer', color: '#D99A72' },
  customer: { label: 'Fur Parent', color: '#C9A58C' },
};