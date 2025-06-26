const express = require('express');
const { 
  getSeats, 
  getSeat, 
  assignSeat, 
  unassignSeat, 
  confirmSeat,
  adminAssignSeat 
} = require('../controllers/seats');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 전체 좌석 목록 조회
router.get('/', getSeats);

// 특정 좌석 조회
router.get('/:number/:section', getSeat);

// 좌석 배정
router.put('/:number/:section/assign', protect, assignSeat);

// 좌석 배정 취소
router.put('/:number/:section/unassign', protect, unassignSeat);

// 좌석 배정 확정 (관리자 전용)
router.put('/:number/:section/confirm', protect, authorize(true), confirmSeat);

// 관리자용 좌석 배정 (관리자 전용)
router.put('/:number/:section/admin-assign', protect, authorize(true), adminAssignSeat);

module.exports = router; 