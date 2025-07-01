const Seat = require('../models/Seat');
const User = require('../models/User');
const AdminInfo = require('../models/AdminInfo');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// 입력값 검증 헬퍼 함수들
const validateStudentId = (studentId) => {
  if (!studentId) return false;
  const id = studentId.toString().trim();
  // 학번은 4자리 이상 20자리 이하의 숫자와 문자 조합
  return /^[a-zA-Z0-9]{4,20}$/.test(id);
};

const validateName = (name) => {
  if (!name) return false;
  const n = name.toString().trim();
  // 이름은 1자리 이상 50자리 이하의 한글, 영문, 공백 허용
  return /^[가-힣a-zA-Z\s]{1,50}$/.test(n);
};

const validatePriority = (priority) => {
  const p = parseInt(priority);
  return !isNaN(p) && p >= 1 && p <= 12;
};

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

const validateRoomNumber = (roomNumber) => {
  if (!roomNumber) return false;
  const r = roomNumber.toString().trim();
  // 방 번호는 3자리 숫자 (501~510 등)
  return /^[0-9]{3,4}$/.test(r);
};

// AdminInfo DB 관리 헬퍼 함수들
const getAdminInfoFromDB = async () => {
  try {
    let adminInfo = await AdminInfo.findOne();
    
    if (!adminInfo) {
      // DB에 adminInfo가 없으면 기본값으로 생성
      adminInfo = await AdminInfo.create({
        name: process.env.ADMIN_NAME || '관리자',
        phone: process.env.ADMIN_PHONE || '02-0000-0000',
        email: process.env.ADMIN_EMAIL || 'admin@sogang.ac.kr',
        department: process.env.ADMIN_DEPARTMENT || '경제학과',
        position: process.env.ADMIN_POSITION || '주임조교'
      });
    }
    
    return adminInfo;
  } catch (error) {
    logger.logError('Error getting admin info from DB:', error);
    // DB 오류 시 기본값 반환
    return {
      name: '관리자',
      phone: '02-0000-0000',
      email: 'admin@sogang.ac.kr',
      department: '경제학과',
      position: '주임조교'
    };
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    // admin 계정 제외하고 조회
    const users = await User.find({ studentId: { $ne: 'admin' } }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    logger.logError('Error fetching users:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Create a user
// @route   POST /api/admin/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
  try {
    const { studentId, name, birthdate = '', priority = 3, isAdmin = false } = req.body;

    // 입력값 검증 강화
    if (!validateStudentId(studentId)) {
      return res.status(400).json({
        success: false,
        message: '학번/수험번호는 4-20자리의 영문, 숫자 조합이어야 합니다'
      });
    }

    if (!validateName(name)) {
      return res.status(400).json({
        success: false,
        message: '이름은 1-50자리의 한글, 영문, 공백만 허용됩니다'
      });
    }

    if (!validatePriority(priority)) {
      return res.status(400).json({
        success: false,
        message: '우선순위는 1-12 사이의 숫자여야 합니다'
      });
    }

    // 기존 사용자 중복 검사
    const existingUser = await User.findOne({ studentId: studentId.toString().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this student ID already exists'
      });
    }

    // 사용자 생성 (초기 비밀번호: sg1234)
    const user = await User.create({
      studentId: studentId.toString().trim(),
      name: name.toString().trim(),
      password: 'sg1234', // 초기 비밀번호 설정
      birthdate: birthdate ? birthdate.toString().trim() : '', // 빈 문자열로 기본값 설정
      priority: parseInt(priority),
      isAdmin: Boolean(isAdmin)
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    logger.logError('Error creating user:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    } else if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this student ID already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    // admin 계정 수정 방지
    if (req.params.id === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin account cannot be modified'
      });
    }

    // 입력값 검증 강화
    const { studentId, name, priority } = req.body;
    
    if (studentId && !validateStudentId(studentId)) {
      return res.status(400).json({
        success: false,
        message: '학번/수험번호는 4-20자리의 영문, 숫자 조합이어야 합니다'
      });
    }

    if (name && !validateName(name)) {
      return res.status(400).json({
        success: false,
        message: '이름은 1-50자리의 한글, 영문, 공백만 허용됩니다'
      });
    }

    if (priority !== undefined && !validatePriority(priority)) {
      return res.status(400).json({
        success: false,
        message: '우선순위는 1-12 사이의 숫자여야 합니다'
      });
    }

    let user = await User.findOne({ studentId: req.params.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with student ID of ${req.params.id}`
      });
    }

    // 타입 변환하여 업데이트
    const updateData = { ...req.body };
    if (updateData.studentId) updateData.studentId = updateData.studentId.toString().trim();
    if (updateData.name) updateData.name = updateData.name.toString().trim();
    if (updateData.priority) updateData.priority = parseInt(updateData.priority);
    if (updateData.isAdmin !== undefined) updateData.isAdmin = Boolean(updateData.isAdmin);

    user = await User.findOneAndUpdate(
      { studentId: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    // admin 계정 삭제 방지
    if (req.params.id === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin account cannot be deleted'
      });
    }

    const user = await User.findOne({ studentId: req.params.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with student ID of ${req.params.id}`
      });
    }

    // 관리자 계정 삭제 방지 (추가 보안)
    if (user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Unassign any seats assigned to this user
    await Seat.updateMany(
      { assignedTo: req.params.id },
      { assignedTo: null, confirmed: false }
    );

    await User.findOneAndDelete({ studentId: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset user password to default
// @route   POST /api/admin/users/:id/reset-password
// @access  Private (Admin only)
exports.resetUserPassword = async (req, res) => {
  try {
    const studentId = req.params.id;

    // 입력값 검증
    if (!studentId) {
      logger.error('Reset password: Missing student ID');
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    logger.info(`Password reset attempt for user: ${studentId}`);

    // admin 계정 비밀번호 초기화 방지
    if (studentId === 'admin') {
      logger.warn(`Blocked attempt to reset admin password`);
      return res.status(403).json({
        success: false,
        message: 'Admin account password cannot be reset'
      });
    }

    // 사용자 조회 (password 필드 포함)
    const user = await User.findOne({ studentId: studentId }).select('+password');

    if (!user) {
      logger.warn(`User not found for password reset: ${studentId}`);
      return res.status(404).json({
        success: false,
        message: `User not found with student ID of ${studentId}`
      });
    }

    logger.info(`Found user for password reset: ${user.studentId} (${user.name})`);

    // 관리자 계정 비밀번호 초기화 방지 (추가 보안)
    if (user.isAdmin) {
      logger.warn(`Blocked attempt to reset admin user password: ${user.studentId}`);
      return res.status(403).json({
        success: false,
        message: 'Cannot reset admin user password'
      });
    }

    // 비밀번호를 초기값으로 리셋
    user.password = 'sg1234';
    
    // 저장 전 로그
    logger.info(`Attempting to save new password for user: ${user.studentId}`);
    
    await user.save();

    logger.info(`Password reset successful for user: ${user.studentId} by admin`);

    res.status(200).json({
      success: true,
      message: '사용자 비밀번호가 초기값으로 재설정되었습니다.',
      data: {
        studentId: user.studentId,
        name: user.name
      }
    });
  } catch (err) {
    logger.error('Error resetting user password:', {
      error: err.message,
      stack: err.stack,
      studentId: req.params.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get all seats
// @route   GET /api/admin/seats
// @access  Private (Admin only)
exports.getSeats = async (req, res) => {
  try {
    const seats = await Seat.find().sort({ roomNumber: 1, number: 1 });

    res.status(200).json({
      success: true,
      count: seats.length,
      data: seats
    });
  } catch (err) {
    logger.logError('Error getting seats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset all seat assignments
// @route   POST /api/admin/seats/reset
// @access  Private (Admin only)
exports.resetAllSeats = async (req, res) => {
  try {
    const result = await Seat.updateMany(
      {},
      { assignedTo: null, confirmed: false, updatedAt: Date.now() }
    );

    res.status(200).json({
      success: true,
      message: `모든 좌석 배정이 초기화되었습니다. (${result.modifiedCount}개 좌석)`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (err) {
    logger.logError('Error resetting seats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Export seats data to Excel
// @route   GET /api/admin/seats/export
// @access  Private (Admin only)
exports.exportSeats = async (req, res) => {
  try {
    // Fetch all seats with assignments
    const seats = await Seat.find().sort({ seatId: 1 });
    
    // Create a map of student IDs to fetch user details
    const studentIds = [...new Set(seats.filter(seat => seat.assignedTo).map(seat => seat.assignedTo))];
    const users = await User.find({ studentId: { $in: studentIds } });
    
    const userMap = {};
    users.forEach(user => {
      userMap[user.studentId] = user;
    });

    // Prepare data for Excel
    const data = seats.map(seat => {
      const user = seat.assignedTo ? userMap[seat.assignedTo] : null;
      return {
        'Seat ID': seat.seatId,
        'Row': seat.row,
        'Column': seat.col,
        'Assigned To': seat.assignedTo || '',
        'Student Name': user ? user.name : '',
        'Priority': user ? user.priority : '',
        'Confirmed': seat.confirmed ? 'Yes' : 'No',
        'Updated At': seat.updatedAt.toISOString().split('T')[0]
      };
    });

    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Seats');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=seat_assignments.xlsx');
    
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create multiple seats at once
// @route   POST /api/admin/seats/batch
// @access  Private (Admin only)
exports.createBatchSeats = async (req, res) => {
  try {
    const { seats } = req.body;

    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of seats'
      });
    }

    // 입력값 검증 강화
    const validSeats = [];
    const errors = [];

    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      const seatNum = i + 1;

      // 필수 필드 검증
      if (!validateSeatNumber(seat.number)) {
        errors.push(`좌석 ${seatNum}: 좌석 번호가 유효하지 않습니다`);
        continue;
      }

      if (!validateRoomNumber(seat.roomNumber)) {
        errors.push(`좌석 ${seatNum}: 방 번호가 유효하지 않습니다 (3-4자리 숫자)`);
        continue;
      }

      // row, col 검증 (숫자 타입)
      const row = parseInt(seat.row);
      const col = parseInt(seat.col);
      if (isNaN(row) || isNaN(col) || row < 0 || col < 0) {
        errors.push(`좌석 ${seatNum}: row, col은 0 이상의 숫자여야 합니다`);
        continue;
      }

      // 룸 번호에 따라 좌석 유형을 자동으로 결정
      let seatType = seat.type;
      if (!seatType) {
        // 501, 503, 505, 507은 박사 과정 연구실
        if (['501', '503', '505', '507'].includes(seat.roomNumber.toString())) {
          seatType = '박사';
        } else {
          // 504, 506, 508, 510은 석사 과정 연구실
          seatType = '석사';
        }
      }

      validSeats.push({
        ...seat,
        number: seat.number.toString().trim(),
        roomNumber: seat.roomNumber.toString().trim(),
        row: row,
        col: col,
        type: seatType,
        active: seat.active !== undefined ? Boolean(seat.active) : true
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '다음 오류를 수정해 주세요:',
        errors: errors
      });
    }

    const result = await Seat.insertMany(validSeats);

    res.status(201).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    } else if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate seat IDs detected'
      });
    } else {
      logger.logError('Error creating batch seats:', err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

// @desc    Bulk create users from CSV
// @route   POST /api/admin/users/bulk
// @access  Private (Admin only)
exports.bulkCreateUsers = async (req, res) => {
  try {
    const { users, duplicateAction = 'skip' } = req.body; // skip, update, error

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of users'
      });
    }

    // 데이터 유효성 검사 강화
    const validUsers = [];
    const errors = [];

    // 첫 번째 패스: 기본 유효성 검사 및 데이터 정규화
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 1;

      // 학번/수험번호 검증
      if (!validateStudentId(user.studentId)) {
        errors.push(`행 ${rowNum}: 학번/수험번호는 4-20자리의 영문, 숫자 조합이어야 합니다`);
        continue;
      }

      // 이름 검증
      if (!validateName(user.name)) {
        errors.push(`행 ${rowNum}: 이름은 1-50자리의 한글, 영문, 공백만 허용됩니다`);
        continue;
      }

      // 우선순위 검증
      if (!validatePriority(user.priority)) {
        errors.push(`행 ${rowNum}: 우선순위는 1-12 사이의 숫자여야 합니다`);
        continue;
      }

      // isAdmin 검증
      const isAdmin = user.isAdmin === 'true' || user.isAdmin === true || user.isAdmin === 1;

      const studentId = user.studentId.toString().trim();
      validUsers.push({
        rowNum,
        studentId: studentId,
        name: user.name.toString().trim(),
        password: 'sg1234', // 초기 비밀번호 설정
        birthdate: user.birthdate ? user.birthdate.toString().trim() : '', // 빈 값 허용
        priority: parseInt(user.priority),
        isAdmin: isAdmin
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '다음 오류를 수정해 주세요:',
        errors: errors
      });
    }

    // 두 번째 패스: 모든 학번을 한 번의 쿼리로 중복 검사 (성능 최적화)
    const studentIds = validUsers.map(user => user.studentId);
    const existingUsers = await User.find({ studentId: { $in: studentIds } });
    const existingStudentIds = new Set(existingUsers.map(user => user.studentId));

    // 중복 처리 로직
    const finalValidUsers = [];
    const usersToUpdate = [];
    let duplicateCount = 0;

    for (const user of validUsers) {
      if (existingStudentIds.has(user.studentId)) {
        duplicateCount++;
        
        if (duplicateAction === 'error') {
          // 중복 시 에러 처리
          errors.push(`행 ${user.rowNum}: 학번/수험번호 ${user.studentId}는 이미 존재합니다`);
          continue;
        } else if (duplicateAction === 'update') {
          // 기존 사용자 업데이트
          const { rowNum, ...userWithoutRowNum } = user;
          usersToUpdate.push(userWithoutRowNum);
          continue;
        } else {
          // duplicateAction === 'skip' - 중복 건너뛰기 (기본값)
          continue;
        }
      }
      
      // 새로운 사용자 추가
      const { rowNum, ...userWithoutRowNum } = user;
      finalValidUsers.push(userWithoutRowNum);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '다음 오류를 수정해 주세요:',
        errors: errors
      });
    }

    let createdCount = 0;
    let updatedCount = 0;

    // 새로운 사용자 생성
    if (finalValidUsers.length > 0) {
      // 각 사용자의 비밀번호를 미리 해시화 (insertMany는 pre-save 미들웨어를 실행하지 않음)
      for (const user of finalValidUsers) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }

      const createdUsers = await User.insertMany(finalValidUsers);
      createdCount = createdUsers.length;
    }

    // 기존 사용자 업데이트
    if (usersToUpdate.length > 0) {
      for (const user of usersToUpdate) {
        // 비밀번호 해시화
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        await User.updateOne(
          { studentId: user.studentId },
          {
            name: user.name,
            password: hashedPassword,
            birthdate: user.birthdate,
            priority: user.priority,
            isAdmin: user.isAdmin,
            updatedAt: Date.now()
          }
        );
        updatedCount++;
      }
    }

    // 결과 메시지 생성
    let message = '';
    if (createdCount > 0 && updatedCount > 0) {
      message = `${createdCount}명이 새로 등록되고 ${updatedCount}명이 업데이트되었습니다`;
    } else if (createdCount > 0) {
      message = `${createdCount}명의 사용자가 성공적으로 등록되었습니다`;
    } else if (updatedCount > 0) {
      message = `${updatedCount}명의 사용자가 업데이트되었습니다`;
    } else {
      message = '처리된 사용자가 없습니다';
    }

    if (duplicateCount > 0 && duplicateAction === 'skip') {
      message += ` (${duplicateCount}명의 중복 사용자는 건너뛰었습니다)`;
    }

    res.status(201).json({
      success: true,
      message: message,
      data: {
        created: createdCount,
        updated: updatedCount,
        duplicates: duplicateCount,
        action: duplicateAction
      }
    });

  } catch (err) {
    logger.logError('Bulk user creation error:', err);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '중복된 학번/수험번호가 있습니다'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Bulk confirm seat assignments
// @route   POST /api/admin/seats/bulk-confirm
// @access  Private (Admin only)
exports.bulkConfirmSeats = async (req, res) => {
  try {
    const { seatIds, roomNumbers, confirmAll } = req.body;
    
    let filter = {};
    
    if (confirmAll === true) {
      // 모든 배정된 좌석을 확정
      filter = { assignedTo: { $ne: null }, confirmed: false };
    } else if (roomNumbers && Array.isArray(roomNumbers) && roomNumbers.length > 0) {
      // 방 번호 검증
      const validRoomNumbers = roomNumbers.filter(room => validateRoomNumber(room));
      if (validRoomNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          message: '유효한 방 번호가 없습니다 (3-4자리 숫자)'
        });
      }
      
      // 특정 방의 배정된 좌석들을 확정
      filter = { 
        roomNumber: { $in: validRoomNumbers.map(r => r.toString()) }, 
        assignedTo: { $ne: null }, 
        confirmed: false 
      };
    } else if (seatIds && Array.isArray(seatIds) && seatIds.length > 0) {
      // MongoDB ObjectId 검증
      const validSeatIds = seatIds.filter(id => {
        if (!id) return false;
        return /^[0-9a-fA-F]{24}$/.test(id.toString());
      });
      
      if (validSeatIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '유효한 좌석 ID가 없습니다'
        });
      }
      
      // 특정 좌석들을 확정
      filter = { 
        _id: { $in: validSeatIds }, 
        assignedTo: { $ne: null }, 
        confirmed: false 
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'seatIds, roomNumbers를 제공하거나 confirmAll을 true로 설정해주세요'
      });
    }

    const result = await Seat.updateMany(
      filter,
      { 
        confirmed: true, 
        updatedAt: Date.now() 
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount}개의 좌석이 확정되었습니다.`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    logger.logError('Error bulk confirming seats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get seat assignment statistics
// @route   GET /api/admin/seats/assignment-stats
// @access  Private (Admin only)
exports.getSeatAssignmentStats = async (req, res) => {
  try {
    const totalSeats = await Seat.countDocuments({ active: true });
    const assignedSeats = await Seat.countDocuments({ assignedTo: { $ne: null }, active: true });
    const confirmedSeats = await Seat.countDocuments({ confirmed: true, active: true });
    const pendingSeats = assignedSeats - confirmedSeats;

    // 방별 통계
    const roomStats = await Seat.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$roomNumber',
          total: { $sum: 1 },
          assigned: {
            $sum: {
              $cond: [{ $ne: ['$assignedTo', null] }, 1, 0]
            }
          },
          confirmed: {
            $sum: {
              $cond: ['$confirmed', 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalSeats,
        assigned: assignedSeats,
        confirmed: confirmedSeats,
        pending: pendingSeats,
        available: totalSeats - assignedSeats,
        assignmentRate: totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) : 0,
        confirmationRate: assignedSeats > 0 ? Math.round((confirmedSeats / assignedSeats) * 100) : 0,
        roomStats: roomStats
      }
    });
  } catch (error) {
    logger.logError('Error getting seat assignment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Bulk delete users
// @route   POST /api/admin/users/bulk-delete
// @access  Private (Admin only)
exports.bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds, deleteAll } = req.body;
    
    let filter = {};
    
    if (deleteAll === true) {
      // 모든 사용자 삭제 (관리자와 admin 계정 제외)
      filter = { 
        isAdmin: { $ne: true },
        studentId: { $ne: 'admin' }
      };
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // 학번/수험번호 검증
      const validUserIds = userIds.filter(id => {
        if (!id) return false;
        // admin 계정 보호
        if (id.toString() === 'admin') return false;
        return validateStudentId(id);
      });
      
      if (validUserIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '유효한 사용자 ID가 없습니다'
        });
      }
      
      // 특정 사용자들 삭제 (관리자와 admin 계정 제외)
      filter = { 
        studentId: { $in: validUserIds.map(id => id.toString().trim()) },
        isAdmin: { $ne: true }
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'userIds를 제공하거나 deleteAll을 true로 설정해주세요'
      });
    }

    // 해당 사용자들에게 배정된 좌석 해제
    const usersToDelete = await User.find(filter);
    const studentIdsToDelete = usersToDelete.map(user => user.studentId);
    
    if (studentIdsToDelete.length > 0) {
      await Seat.updateMany(
        { assignedTo: { $in: studentIdsToDelete } },
        { assignedTo: null, confirmed: false, updatedAt: Date.now() }
      );
    }

    // 사용자 삭제
    const result = await User.deleteMany(filter);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount}명의 사용자가 삭제되었습니다.`,
      data: {
        deletedCount: result.deletedCount,
        seatUnassignments: studentIdsToDelete.length
      }
    });
  } catch (error) {
    logger.logError('Error bulk deleting users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get admin info
// @route   GET /api/admin/info
// @access  Public (for login page)
exports.getAdminInfo = async (req, res) => {
  try {
    const adminInfo = await getAdminInfoFromDB();
    
    res.status(200).json({
      success: true,
      data: adminInfo
    });
  } catch (err) {
    logger.logError('Error fetching admin info:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update admin info
// @route   PUT /api/admin/info
// @access  Private (Admin only)
exports.updateAdminInfo = async (req, res) => {
  try {
    const { name, phone, email, department, position } = req.body;
    
    // 입력값 검증 강화
    if (!name || name.toString().trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '이름은 필수 입력 항목입니다.'
      });
    }

    if (!phone || !/^[0-9\-\+\(\)\s]{8,20}$/.test(phone.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: '전화번호 형식이 올바르지 않습니다. (8-20자리 숫자, -, +, (), 공백 허용)'
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: '이메일 형식이 올바르지 않습니다.'
      });
    }

    const updateData = {
      name: name.toString().trim(),
      phone: phone.toString().trim(),
      email: email.toString().trim(),
      department: department ? department.toString().trim() : '경제학과',
      position: position ? position.toString().trim() : '주임조교'
    };

    // DB에서 관리자 정보 업데이트 또는 생성
    let adminInfo = await AdminInfo.findOne();
    
    if (adminInfo) {
      // 기존 정보 업데이트
      adminInfo = await AdminInfo.findOneAndUpdate(
        {},
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      // 새로 생성
      adminInfo = await AdminInfo.create(updateData);
    }
    
    res.status(200).json({
      success: true,
      message: '관리자 정보가 성공적으로 업데이트되었습니다.',
      data: adminInfo
    });
  } catch (err) {
    logger.logError('Error updating admin info:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 