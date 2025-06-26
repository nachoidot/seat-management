import { useRouter } from 'next/router';
import { useEffect, useCallback } from 'react';
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
// Logout function
export const logout = (isAutoLogout = false) => {
  if (typeof window === 'undefined') return;
  
  // Clear authentication data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('lastActivity');
  
  // 자동 로그아웃 시 알림
  if (isAutoLogout) {
    alert('보안을 위해 세션이 만료되어 자동 로그아웃됩니다.');
  }
  
  // Redirect to login page
  window.location.href = '/login';
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
  updateLastActivity(); // 로그인 시 활동 시간 업데이트
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

// 세션 타임아웃 설정 (30분 = 30 * 60 * 1000ms)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// 경고 시간 (5분 전)
const WARNING_TIME = 5 * 60 * 1000;

// 마지막 활동 시간 업데이트
export const updateLastActivity = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lastActivity', Date.now().toString());
};

// 마지막 활동 시간 가져오기
export const getLastActivity = () => {
  if (typeof window === 'undefined') return null;
  const lastActivity = localStorage.getItem('lastActivity');
  return lastActivity ? parseInt(lastActivity) : null;
};

// 세션이 만료되었는지 확인
export const isSessionExpired = () => {
  const lastActivity = getLastActivity();
  if (!lastActivity) return true;
  
  const now = Date.now();
  return (now - lastActivity) > SESSION_TIMEOUT;
};

// 경고 시간에 도달했는지 확인
export const shouldShowWarning = () => {
  const lastActivity = getLastActivity();
  if (!lastActivity) return false;
  
  const now = Date.now();
  const timeLeft = SESSION_TIMEOUT - (now - lastActivity);
  return timeLeft > 0 && timeLeft <= WARNING_TIME;
};

// 남은 세션 시간 계산 (분 단위)
export const getRemainingTime = () => {
  const lastActivity = getLastActivity();
  if (!lastActivity) return 0;
  
  const now = Date.now();
  const timeLeft = SESSION_TIMEOUT - (now - lastActivity);
  return Math.max(0, Math.ceil(timeLeft / 60000)); // 분 단위로 반환
};

// 세션 타임아웃 훅
export const useSessionTimeout = () => {
  const router = useRouter();

  const checkSession = useCallback(() => {
    if (!isAuthenticated()) return;

    if (isSessionExpired()) {
      logout(true); // 자동 로그아웃
      return;
    }

    if (shouldShowWarning()) {
      const remainingTime = getRemainingTime();
      const shouldContinue = confirm(
        `세션이 ${remainingTime}분 후에 만료됩니다.\n계속 사용하시겠습니까?`
      );
      
      if (shouldContinue) {
        updateLastActivity(); // 활동 시간 연장
      } else {
        logout(); // 수동 로그아웃
      }
    }
  }, [router]);

  // 사용자 활동 감지 이벤트들
  const handleActivity = useCallback(() => {
    if (isAuthenticated()) {
      updateLastActivity();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 페이지 로드 시 세션 확인
    checkSession();

    // 주기적으로 세션 확인 (1분마다)
    const sessionCheckInterval = setInterval(checkSession, 60000);

    // 사용자 활동 감지 이벤트 리스너
    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // 클린업
    return () => {
      clearInterval(sessionCheckInterval);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [checkSession, handleActivity]);

  return {
    checkSession,
    getRemainingTime,
    updateLastActivity
  };
}; 