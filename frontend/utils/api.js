import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication API calls
export const login = async (studentId, name, birthdate = '') => {
  const response = await api.post('/auth/login', {
    studentId,
    name,
    birthdate
  });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Seats API calls
export const getSeats = async () => {
  const response = await api.get('/seats');
  return response.data;
};

export const getSeat = async (number, section) => {
  const response = await api.get(`/seats/${number}/${section}`);
  return response.data;
};

export const assignSeat = async (number, section) => {
  const response = await api.put(`/seats/${number}/${section}/assign`);
  return response.data;
};

export const unassignSeat = async (number, section) => {
  const response = await api.put(`/seats/${number}/${section}/unassign`);
  return response.data;
};

export const confirmSeat = async (number, section) => {
  const response = await api.put(`/seats/${number}/${section}/confirm`);
  return response.data;
};

// 좌석 일괄 확정
export const bulkConfirmSeats = async (options = {}) => {
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
  try {
    console.log('API 호출: getTimeSlots');
    const response = await api.get('/timeslots');
    console.log('API 원본 응답:', response);
    
    // API 응답 형식 유효성 검사
    if (!response || !response.data) {
      console.error('API 응답이 비어있음:', response);
      throw new Error('API 응답이 비어있습니다.');
    }
    
    console.log('API 응답 데이터 구조:', {
      isArray: Array.isArray(response.data),
      hasData: !!response.data.data,
      hasSuccess: 'success' in response.data,
      dataType: typeof response.data
    });
    
    // 직접 응답 객체 반환 (가공하지 않음)
    return response.data;
  } catch (error) {
    console.error('일정 데이터 조회 오류:', error);
    // 에러를 던져서 호출자가 처리하도록 함
    throw error;
  }
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

export const bulkCreateUsers = async (users) => {
  const response = await api.post('/admin/users/bulk', { users });
  return response.data;
};

// 사용자 일괄 삭제
export const bulkDeleteUsers = async (options = {}) => {
  const response = await api.post('/admin/users/bulk-delete', options);
  return response.data;
};

export const resetSeats = async () => {
  const response = await api.put('/admin/seats/reset');
  return response.data;
};

export const createTimeSlot = async (timeSlotData) => {
  try {
    console.log('createTimeSlot API 호출:', timeSlotData);
    const response = await api.post('/timeslots', timeSlotData);
    console.log('createTimeSlot 응답:', response);
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
    console.log(`updateTimeSlot API 호출 - ID: ${id}`, timeSlotData);
    const response = await api.put(`/timeslots/${id}`, timeSlotData);
    console.log('updateTimeSlot 응답:', response);
    return response.data;
  } catch (error) {
    console.error('updateTimeSlot 에러:', error);
    console.error('에러 응답 데이터:', error.response?.data);
    console.error('에러 상태 코드:', error.response?.status);
    throw error;
  }
};

export const deleteTimeSlot = async (id) => {
  const response = await api.delete(`/timeslots/${id}`);
  return response.data;
};

export const createBatchSeats = async (seatsData) => {
  const response = await api.post('/admin/seats/batch', { seats: seatsData });
  return response.data;
};

// 관리자용 좌석 배정
export const adminAssignSeat = async (number, section, studentId) => {
  const response = await api.put(`/seats/${number}/${section}/admin-assign`, { studentId });
  return response.data;
};

export default api; 