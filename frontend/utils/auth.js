import { useRouter } from 'next/router';
import { useEffect, useCallback, useState } from 'react';
import { getMe, logout as apiLogout } from './api';

// Token helpers
export const setToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// Check if user is authenticated by calling server
export const isAuthenticated = async () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = getToken();
  if (!token) return false;

  try {
    const response = await getMe();
    return response.success && response.user;
  } catch (error) {
    return false;
  }
};

// Get current user from server
export const getCurrentUser = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = getToken();
  if (!token) return null;

  try {
    const response = await getMe();
    return response.success ? response.user : null;
  } catch (error) {
    return null;
  }
};

// Logout function
export const logout = async (isAutoLogout = false) => {
  if (typeof window === 'undefined') return;

  try {
    // 서버에 로그아웃 알림 (옵션)
    await apiLogout();
  } catch (error) {
    // 서버 호출 실패해도 클라이언트에서 로그아웃 진행
    console.error('Logout API call failed:', error);
  }

  removeToken();

  // 자동 로그아웃 시 알림
  if (isAutoLogout) {
    alert('보안을 위해 세션이 만료되어 자동 로그아웃됩니다.');
  }

  // 캐시 클리어 (선택사항)
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }

  // Redirect to login page
  window.location.href = '/login';
};

// Check if user is admin
export const isAdmin = async () => {
  const user = await getCurrentUser();
  return user && user.isAdmin;
};

// Authentication hooks - 이제 useState를 사용하여 인증 상태 관리
export const useAuth = (redirectUrl = '/login') => {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(null); // null: loading, true: authenticated, false: not authenticated

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      setAuthenticated(isAuth);

      if (!isAuth && router.pathname !== '/login') {
        router.push(redirectUrl);
      }
    };

    checkAuth();
  }, [router, redirectUrl]);

  return authenticated;
};

// Hook to redirect if user is not admin
export const useAdmin = (redirectUrl = '/') => {
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(null);
  const authenticated = useAuth('/login');

  useEffect(() => {
    const checkAdmin = async () => {
      if (authenticated) {
        const adminStatus = await isAdmin();
        setIsAdminUser(adminStatus);

        if (!adminStatus) {
          router.push(redirectUrl);
        }
      }
    };

    if (authenticated !== null) {
      checkAdmin();
    }
  }, [authenticated, router, redirectUrl]);

  return isAdminUser;
};

// Hook for checking authentication status with user data
export const useAuthStatus = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  return { user, loading, authenticated: !!user };
};
