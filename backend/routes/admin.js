const express = require('express');
const { 
  getUsers, 
  createUser,
  updateUser,
  deleteUser,
  getSeats, 
  resetAllSeats, 
  exportSeats,
  bulkCreateUsers,
  bulkDeleteUsers,
  bulkConfirmSeats,
  getSeatAssignmentStats,
  getAdminInfo,
  updateAdminInfo,
  resetUserPassword
} = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 관리자 정보 조회 (공개 - 로그인 페이지용)
router.get('/info', getAdminInfo);

// 모든 라우트에 관리자 권한 적용
router.use(protect);
router.use(authorize(true));

// 사용자 관련 라우트
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/bulk', bulkCreateUsers);
router.post('/users/bulk-delete', bulkDeleteUsers);
router.post('/users/:id/reset-password', resetUserPassword);

// 좌석 관련 라우트  
router.get('/seats', getSeats);
router.post('/seats/reset', resetAllSeats);
router.get('/seats/export', exportSeats);
router.post('/seats/bulk-confirm', bulkConfirmSeats);
router.get('/seats/assignment-stats', getSeatAssignmentStats);

// 관리자 정보 업데이트 (관리자 전용)
router.put('/info', updateAdminInfo);

module.exports = router; 