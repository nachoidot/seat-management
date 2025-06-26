import { useRouter } from 'next/router';
import { useEffect } from 'react';
import jwtDecode from 'jwt-decode';

// Check if user is authenticated
export const isAuthenticated = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }

  try {
    // Check if token is expired
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      // Token expired, remove from storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Invalid token:', error);
    return false;
  }
};

// Get current user from localStorage
export const getCurrentUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }

  try {
    const user = JSON.parse(userStr);
    return user;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Check if user is admin
export const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.isAdmin;
};

// Set token and user data in localStorage
export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

// Clear authentication data from localStorage
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Hook to redirect if user is not authenticated
export const useAuth = (redirectUrl = '/login') => {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated() && router.pathname !== '/login') {
      router.push(redirectUrl);
    }
  }, [router, redirectUrl]);

  return isAuthenticated();
};

// Hook to redirect if user is not admin
export const useAdmin = (redirectUrl = '/') => {
  const router = useRouter();
  const authenticated = useAuth('/login');

  useEffect(() => {
    if (authenticated && !isAdmin()) {
      router.push(redirectUrl);
    }
  }, [authenticated, router, redirectUrl]);

  return isAdmin();
}; 