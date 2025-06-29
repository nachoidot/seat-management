const Seat = require('../models/Seat');
const User = require('../models/User');
const TimeSlot = require('../models/TimeSlot');
const logger = require('../utils/logger');

// @desc    Get all seats
// @route   GET /api/seats
// @access  Public
exports.getSeats = async (req, res) => {
  try {
    const seats = await Seat.find();
    
    if (!seats) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    res.status(200).json({
      success: true,
      count: seats.length,
      data: seats
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get single seat
// @route   GET /api/seats/:number/:section
// @access  Public
exports.getSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    // 입력값 검증 강화
    if (!validateSeatNumber(number)) {
      return res.status(400).json({
        success: false,
        message: '좌석 번호 형식이 올바르지 않습니다 (1-10자리 영문, 숫자 조합)'
      });
    }

    if (!validateSection(section)) {
      return res.status(400).json({
        success: false,
        message: '섹션 형식이 올바르지 않습니다 (1-20자리 영문, 숫자, -, _ 조합)'
      });
    }
    
    const seat = await Seat.findOne({ number, section });

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// 입력값 검증 헬퍼 함수들
const validateSeatNumber = (number) => {
  if (!number) return false;
  const n = number.toString().trim();
  // 좌석 번호는 1자리 이상 10자리 이하의 숫자와 문자 조합
  return /^[a-zA-Z0-9]{1,10}$/.test(n);
};

const validateSection = (section) => {
  if (!section) return false;
  const s = section.toString().trim();
  // 섹션은 1자리 이상 20자리 이하의 문자
  return /^[a-zA-Z0-9\-_]{1,20}$/.test(s);
};

// @desc    Assign a seat to a student
// @route   PUT /api/seats/:number/:section/assign
// @access  Private
exports.assignSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    // 입력값 검증 강화
    if (!validateSeatNumber(number)) {
      return res.status(400).json({
        success: false,
        message: '좌석 번호 형식이 올바르지 않습니다 (1-10자리 영문, 숫자 조합)'
      });
    }

    if (!validateSection(section)) {
      return res.status(400).json({
        success: false,
        message: '섹션 형식이 올바르지 않습니다 (1-20자리 영문, 숫자, -, _ 조합)'
      });
    }
    
    // Check if user can currently register
    const user = await User.findOne({ studentId: req.user.studentId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 새로운 접근 규칙 적용
    if (!user.isAdmin) {
      const now = new Date();
      
      // 활성화된 일정 찾기
      const timeSlot = await TimeSlot.findOne({ active: true }).sort({ baseDate: -1 });
      
      if (!timeSlot) {
        return res.status(403).json({
          success: false,
          message: '현재 활성화된 배정 일정이 없습니다.'
        });
      }
      
      const baseDate = new Date(timeSlot.baseDate);
      const endDate = new Date(timeSlot.endDate);
      endDate.setHours(23, 59, 59, 999); // 종료일의 마지막 시간
      
      // 배정 일정이 종료되었으면 접근 불가
      if (now > endDate) {
        return res.status(403).json({
          success: false,
          message: '배정 일정이 종료되었습니다.'
        });
      }
      
      // 15:00 시간 계산
      const commonAccessTime = new Date(baseDate);
      commonAccessTime.setHours(15, 0, 0, 0);
      
      let canAccess = false;
      
      // 1순위와 12순위는 15:00부터 접근 가능
      if (user.priority === 1 || user.priority === 12) {
        canAccess = now >= commonAccessTime;
      } else {
        // 나머지 우선순위는 자신의 배정시간 또는 15:00 이후 접근 가능
        const ownStartTime = new Date(baseDate);
        const ownEndTime = new Date(baseDate);
        
        // 우선순위별 시간 설정
        const priorityTimes = {
          11: { hour: 10, minute: 0 },
          10: { hour: 10, minute: 30 },
          9: { hour: 11, minute: 0 },
          8: { hour: 11, minute: 30 },
          7: { hour: 12, minute: 0 },
          6: { hour: 12, minute: 30 },
          5: { hour: 13, minute: 0 },
          4: { hour: 13, minute: 30 },
          3: { hour: 14, minute: 0 },
          2: { hour: 14, minute: 30 },
          1: { hour: 15, minute: 0 },
          12: { hour: 15, minute: 0 }  // 15:00으로 통일
        };
        
        if (priorityTimes[user.priority]) {
          const { hour, minute } = priorityTimes[user.priority];
          ownStartTime.setHours(hour, minute, 0, 0);
          ownEndTime.setHours(hour, minute, 30, 0);
          
          // 자신의 배정시간 내에 있거나 15:00 이후인 경우
          canAccess = (now >= ownStartTime && now <= ownEndTime) || now >= commonAccessTime;
        } else {
          // 우선순위가 정의되지 않은 경우 15:00 이후만 접근 가능
          canAccess = now >= commonAccessTime;
        }
      }
      
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: '현재 시간에 좌석 배정 권한이 없습니다.'
        });
      }
    }

    // Race condition 방지: 원자적 연산으로 좌석 배정 처리
    // 1. 사용자가 이미 좌석을 보유했는지 확인 및 좌석 배정을 한 번의 트랜잭션으로 처리
    
    // 먼저 좌석이 존재하는지 확인
    const seatExists = await Seat.findOne({ number, section });
    if (!seatExists) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    let seat;
    
    if (user.isAdmin) {
      // 관리자는 제약 없이 배정 가능
      seat = await Seat.findOneAndUpdate(
        { number, section },
        { 
          assignedTo: req.user.studentId,
          confirmed: true,
          updatedAt: Date.now()
        },
        { new: true, runValidators: true }
      );
    } else {
      // 일반 사용자의 경우: 먼저 사용자가 이미 좌석을 가지고 있는지 확인
      const existingUserSeat = await Seat.findOne({ assignedTo: req.user.studentId });
      
      if (existingUserSeat) {
        return res.status(400).json({
          success: false,
          message: 'You already have a seat assigned',
          data: {
            currentSeat: {
              roomNumber: existingUserSeat.roomNumber,
              number: existingUserSeat.number,
              section: existingUserSeat.section,
              confirmed: existingUserSeat.confirmed
            }
          }
        });
      }
      
      // 원자적 좌석 배정: 좌석이 비어있을 때만 배정
      seat = await Seat.findOneAndUpdate(
        { 
          number, 
          section,
          assignedTo: null  // 중요: 좌석이 비어있을 때만 배정
        },
        { 
          assignedTo: req.user.studentId,
          confirmed: false,
          updatedAt: Date.now()
        },
        { new: true, runValidators: true }
      );

      // 좌석이 이미 배정되어 있어서 업데이트가 실패한 경우
      if (!seat) {
        return res.status(400).json({
          success: false,
          message: 'This seat is already assigned to someone else'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    logger.logError(err, req);
    
    // MongoDB duplicate key error (사용자가 이미 다른 좌석을 보유한 경우)
    // 이중 보호: 위의 명시적 확인을 우회하는 race condition이 있을 경우
    if (err.code === 11000 && err.keyPattern?.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'You already have a seat assigned'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Unassign a seat
// @route   PUT /api/seats/:number/:section/unassign
// @access  Private
exports.unassignSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    // 입력 검증
    if (!number || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both seat number and section'
      });
    }
    
    // Check if seat exists
    let seat = await Seat.findOne({ number, section });
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    // Check if user is admin or the seat is assigned to the user
    if (!req.user.isAdmin && seat.assignedTo !== req.user.studentId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to unassign this seat'
      });
    }

    // Update seat
    seat = await Seat.findOneAndUpdate(
      { number, section },
      { assignedTo: null, confirmed: false, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Confirm a seat assignment (Admin only)
// @route   PUT /api/seats/:number/:section/confirm
// @access  Private (Admin only)
exports.confirmSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    // 입력 검증
    if (!number || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both seat number and section'
      });
    }
    
    // Check if seat exists
    let seat = await Seat.findOne({ number, section });
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    // Make sure seat is assigned to someone
    if (!seat.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'This seat is not assigned to anyone'
      });
    }

    // Update seat
    seat = await Seat.findOneAndUpdate(
      { number, section },
      { confirmed: true, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Admin assign seat to specific user
// @route   PUT /api/seats/:number/:section/admin-assign
// @access  Private (Admin only)
exports.adminAssignSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    const { studentId } = req.body;
    
    // 입력 검증
    if (!number || !section || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide seat number, section, and student ID'
      });
    }
    
    // Check if seat exists
    let seat = await Seat.findOne({ number, section });
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    // Check if seat is already assigned
    if (seat.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'This seat is already assigned to someone else'
      });
    }

    // Check if user exists
    const user = await User.findOne({ studentId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with student ID ${studentId}`
      });
    }

    // Check if user already has a seat assigned
    const existingSeat = await Seat.findOne({ assignedTo: studentId });
    if (existingSeat) {
      return res.status(400).json({
        success: false,
        message: `User ${studentId} already has a seat assigned (${existingSeat.roomNumber}호 ${existingSeat.number}번)`
      });
    }

    // Update seat
    seat = await Seat.findOneAndUpdate(
      { number, section },
      { 
        assignedTo: studentId, 
        confirmed: false, // 관리자가 배정한 경우 확정 대기 상태
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
}; 