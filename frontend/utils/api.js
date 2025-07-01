import axios from 'axios';

import { ensureServerAwake } from './wakeup';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// 캐시 저장소
const cache = new Map();
const CACHE_DURATION = 30000; // 30초

// 진행 중인 요청들을 추적하여 중복 요청 방지
const ongoingRequests = new Map();

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Authorization 헤더에 토큰 추가
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 캐시된 응답 확인 함수
const getCachedResponse = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// 응답 캐시 저장 함수
const setCachedResponse = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// 중복 요청 방지를 위한 함수
const makeRequestWithDeduplication = async (key, requestFn) => {
  // 캐시된 응답이 있으면 반환
  const cached = getCachedResponse(key);
  if (cached) {
    return cached;
  }

  // 이미 진행 중인 요청이 있으면 기다림
  if (ongoingRequests.has(key)) {
    return ongoingRequests.get(key);
  }

  // 새로운 요청 시작
  const requestPromise = requestFn().then(response => {
    setCachedResponse(key, response);
    ongoingRequests.delete(key);
    return response;
  }).catch(error => {
    ongoingRequests.delete(key);
    throw error;
  });

  ongoingRequests.set(key, requestPromise);
  return requestPromise;
};

// Authentication API calls
export const login = async (studentId, name, password) => {
  const response = await api.post('/auth/login', {
    studentId,
    name,
    password
  });
  return response.data;
};

export const logout = async () => {
  const response = await api.get('/auth/logout');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/auth/change-password', {
    currentPassword,
    newPassword
  });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Seats API calls
export const getSeats = async () => {
  return makeRequestWithDeduplication('seats', async () => {
    // 서버 Wake-up 확인
    await ensureServerAwake();
    
    const response = await api.get('/seats');
    return response.data;
  });
};

export const getSeat = async (number, section) => {
  const response = await api.get(`/seats/${number}/${section}`);
  return response.data;
};

export const assignSeat = async (number, section) => {
  // 좌석 배정 후 캐시 무효화
  cache.delete('seats');
  
  const response = await api.put(`/seats/${number}/${section}/assign`);
  return response.data;
};

export const unassignSeat = async (number, section) => {
  // 좌석 해제 후 캐시 무효화
  cache.delete('seats');
  
  const response = await api.put(`/seats/${number}/${section}/unassign`);
  return response.data;
};

export const confirmSeat = async (number, section) => {
  // 좌석 확정 후 캐시 무효화
  cache.delete('seats');
  
  const response = await api.put(`/seats/${number}/${section}/confirm`);
  return response.data;
};

// 좌석 일괄 확정
export const bulkConfirmSeats = async (options = {}) => {
  // 좌석 일괄 확정 후 캐시 무효화
  cache.delete('seats');
  
  const response = await api.post('/admin/seats/bulk-confirm', options);
  return response.data;
};

// 좌석 배정 통계 조회
export const getSeatAssignmentStats = async () => {
  const response = await api.get('/admin/seats/assignment-stats');
  return response.data;
};

// TimeSlots API calls
export const getTimeSlots = async () => {
  return makeRequestWithDeduplication('timeslots', async () => {
    // 서버 Wake-up 확인
    await ensureServerAwake();
    
    const response = await api.get('/timeslots');
    return response.data;
  });
};

// Admin API calls
export const getUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/admin/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

export const resetUserPassword = async (id) => {
  const response = await api.post(`/admin/users/${id}/reset-password`);
  return response.data;
};

export const bulkCreateUsers = async (users, duplicateAction = 'skip') => {
  const response = await api.post('/admin/users/bulk', { users, duplicateAction });
  return response.data;
};

// 사용자 일괄 삭제
export const bulkDeleteUsers = async (options = {}) => {
  const response = await api.post('/admin/users/bulk-delete', options);
  return response.data;
};

export const resetSeats = async () => {
  // 좌석 리셋 후 캐시 무효화
  cache.delete('seats');
  
  const response = await api.post('/admin/seats/reset');
  return response.data;
};

export const createTimeSlot = async (timeSlotData) => {
  try {
    // 타임슬롯 생성 후 캐시 무효화
    cache.delete('timeslots');
    
    const response = await api.post('/timeslots', timeSlotData);
    return response.data;
  } catch (error) {
    console.error('createTimeSlot 에러:', error);
    console.error('에러 응답 데이터:', error.response?.data);
    console.error('에러 상태 코드:', error.response?.status);
    throw error;
  }
};

export const updateTimeSlot = async (id, timeSlotData) => {
  try {
    // 타임슬롯 수정 후 캐시 무효화
    cache.delete('timeslots');
    
    const response = await api.put(`/timeslots/${id}`, timeSlotData);
    return response.data;
  } catch (error) {
    console.error('updateTimeSlot 에러:', error);
    console.error('에러 응답 데이터:', error.response?.data);
    console.error('에러 상태 코드:', error.response?.status);
    throw error;
  }
};

export const deleteTimeSlot = async (id) => {
  // 타임슬롯 삭제 후 캐시 무효화
  cache.delete('timeslots');
  
  const response = await api.delete(`/timeslots/${id}`);
  return response.data;
};

export const createBatchSeats = async (seatsData) => {
  // 일괄 좌석 생성 후 캐시 무효화
  cache.delete('seats');
  
  const response = await api.post('/admin/seats/batch', { seats: seatsData });
  return response.data;
};

// 관리자용 좌석 배정
export const adminAssignSeat = async (number, section, studentId) => {
  // 관리자 좌석 배정 후 캐시 무효화
  cache.delete('seats');
  
  const response = await api.put(`/seats/${number}/${section}/admin-assign`, { studentId });
  return response.data;
};

// 관리자 정보 조회
export const getAdminInfo = async () => {
  const response = await api.get('/admin/info');
  return response.data;
};

// 관리자 정보 업데이트
export const updateAdminInfo = async (adminInfo) => {
  const response = await api.put('/admin/info', adminInfo);
  return response.data;
};

// 엑셀 내보내기 (토큰 인증 포함)
export const exportSeatsToExcel = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
  }

  const response = await fetch(`${API_URL}/admin/seats/export`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '파일 다운로드에 실패했습니다.' }));
    throw new Error(errorData.message || '파일 다운로드에 실패했습니다.');
  }

  // blob으로 변환
  const blob = await response.blob();
  
  // 파일 다운로드
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `seat_assignments_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return { success: true, message: '엑셀 파일이 다운로드되었습니다.' };
};

// 캐시 수동 무효화 함수 (필요시 사용)
export const invalidateCache = (key = null) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

export default api; 