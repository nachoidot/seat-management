import { useRouter } from 'next/router';
import { useEffect, useCallback, useState } from 'react';
import { getMe, logout as apiLogout } from './api';

// Check if user is authenticated by calling server
export const isAuthenticated = async () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const response = await getMe();
    return response.success && response.data;
  } catch (error) {
    return false;
  }
};

// Get current user from server
export const getCurrentUser = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await getMe();
    return response.success ? response.data : null;
  } catch (error) {
    return null;
  }
};

// Logout function
export const logout = async (isAutoLogout = false) => {
  if (typeof window === 'undefined') return;
  
  try {
    // 서버에서 쿠키 삭제
    await apiLogout();
  } catch (error) {
    // 서버 호출 실패해도 클라이언트에서 로그아웃 진행
    console.error('Logout API call failed:', error);
  }
  
  // 자동 로그아웃 시 알림
  if (isAutoLogout) {
    alert('보안을 위해 세션이 만료되어 자동 로그아웃됩니다.');
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