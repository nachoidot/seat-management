const Seat = require('../models/Seat');
const User = require('../models/User');
const XLSX = require('xlsx');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ studentId: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create a user
// @route   POST /api/admin/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
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
    let user = await User.findOne({ studentId: req.params.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with student ID of ${req.params.id}`
      });
    }

    user = await User.findOneAndUpdate(
      { studentId: req.params.id },
      req.body,
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
    const user = await User.findOne({ studentId: req.params.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with student ID of ${req.params.id}`
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
    console.error('Error getting seats:', err);
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
    console.error('Error resetting seats:', err);
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

    // 각 좌석에 type이 없으면 룸 번호에 따라 자동으로 추가
    const processedSeats = seats.map(seat => {
      // 룸 번호에 따라 좌석 유형을 자동으로 결정
      if (!seat.type) {
        // 501, 503, 505, 507은 박사 과정 연구실
        if (['501', '503', '505', '507'].includes(seat.roomNumber)) {
          seat.type = '박사';
        } else {
          // 504, 506, 508, 510은 석사 과정 연구실
          seat.type = '석사';
        }
      }
      
      return seat;
    });

    const result = await Seat.insertMany(processedSeats);

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
      console.error('Error creating batch seats:', err);
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
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of users'
      });
    }

    // 데이터 유효성 검사
    const validUsers = [];
    const errors = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 1;

      // 필수 필드 검사
      if (!user.studentId || !user.name || !user.birthdate) {
        errors.push(`행 ${rowNum}: 학번/수험번호, 이름, 생년월일은 필수입니다`);
        continue;
      }

      // 생년월일 형식 검사 (YYYYMMDD)
      if (!/^\d{8}$/.test(user.birthdate)) {
        errors.push(`행 ${rowNum}: 생년월일은 YYYYMMDD 형식의 8자리 숫자여야 합니다`);
        continue;
      }

      // 우선순위 검사
      const priority = parseInt(user.priority);
      if (!priority || priority < 1 || priority > 12) {
        errors.push(`행 ${rowNum}: 우선순위는 1-12 사이의 숫자여야 합니다`);
        continue;
      }

      // 기존 사용자 중복 검사
      const existingUser = await User.findOne({ studentId: user.studentId });
      if (existingUser) {
        errors.push(`행 ${rowNum}: 학번/수험번호 ${user.studentId}는 이미 존재합니다`);
        continue;
      }

      validUsers.push({
        studentId: user.studentId.toString().trim(),
        name: user.name.toString().trim(),
        birthdate: user.birthdate.toString().trim(),
        priority: priority,
        isAdmin: user.isAdmin === 'true' || user.isAdmin === true || false
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '다음 오류를 수정해 주세요:',
        errors: errors
      });
    }

    if (validUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 사용자 데이터가 없습니다'
      });
    }

    // 사용자 일괄 생성
    const createdUsers = await User.insertMany(validUsers);

    res.status(201).json({
      success: true,
      message: `${createdUsers.length}명의 사용자가 성공적으로 등록되었습니다`,
      count: createdUsers.length,
      data: createdUsers
    });

  } catch (err) {
    console.error('Bulk user creation error:', err);
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
    
    if (confirmAll) {
      // 모든 배정된 좌석을 확정
      filter = { assignedTo: { $ne: null }, confirmed: false };
    } else if (roomNumbers && roomNumbers.length > 0) {
      // 특정 방의 배정된 좌석들을 확정
      filter = { 
        roomNumber: { $in: roomNumbers }, 
        assignedTo: { $ne: null }, 
        confirmed: false 
      };
    } else if (seatIds && seatIds.length > 0) {
      // 특정 좌석들을 확정
      filter = { 
        _id: { $in: seatIds }, 
        assignedTo: { $ne: null }, 
        confirmed: false 
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide seatIds, roomNumbers, or set confirmAll to true'
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
    console.error('Error bulk confirming seats:', error);
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
    console.error('Error getting seat assignment stats:', error);
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
    
    if (deleteAll) {
      // 모든 사용자 삭제 (관리자 제외)
      filter = { isAdmin: { $ne: true } };
    } else if (userIds && userIds.length > 0) {
      // 특정 사용자들 삭제
      filter = { 
        studentId: { $in: userIds },
        isAdmin: { $ne: true } // 관리자는 삭제 불가
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide userIds or set deleteAll to true'
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
    console.error('Error bulk deleting users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}; 