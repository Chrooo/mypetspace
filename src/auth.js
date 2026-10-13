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
