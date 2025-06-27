const TimeSlot = require('../models/TimeSlot');

// @desc    Get all time slots
// @route   GET /api/timeslots
// @access  Public
exports.getTimeSlots = async (req, res) => {
  try {
    const timeSlots = await TimeSlot.find().sort({ priority: 1 });

    res.status(200).json({
      success: true,
      count: timeSlots.length,
      data: timeSlots
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single time slot
// @route   GET /api/timeslots/:id
// @access  Public
exports.getTimeSlot = async (req, res) => {
  try {
    const timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: `Time slot not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: timeSlot
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new time slot
// @route   POST /api/timeslots
// @access  Private (Admin only)
exports.createTimeSlot = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
    console.log('일정 추가 요청 시작');
  }
    
    // 데이터 검증 단계 추가
    if (!req.body.title || !req.body.baseDate || !req.body.endDate) {
      console.error('필수 필드 누락:', { 
        hasTitle: !!req.body.title, 
        hasBaseDate: !!req.body.baseDate, 
        hasEndDate: !!req.body.endDate 
      });
      return res.status(400).json({
        success: false,
        message: '제목, 시작일, 종료일은 필수 항목입니다.'
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('날짜 형식 검증 중...');
    }
    
    const timeSlot = await TimeSlot.create(req.body);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('일정 생성 완료');
    }

    res.status(201).json({
      success: true,
      data: timeSlot
    });
  } catch (err) {
    console.error('일정 생성 오류:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      console.error('유효성 검사 오류:', messages);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    } else {
      console.error('서버 오류:', err.message, err.stack);
      res.status(500).json({
        success: false,
        message: `서버 오류: ${err.message}`
      });
    }
  }
};

// @desc    Update time slot
// @route   PUT /api/timeslots/:id
// @access  Private (Admin only)
exports.updateTimeSlot = async (req, res) => {
  try {
    let timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        message: `Time slot not found with id of ${req.params.id}`
      });
    }

    timeSlot = await TimeSlot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: timeSlot
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

// @desc    Delete time slot
// @route   DELETE /api/timeslots/:id
// @access  Private (Admin only)
exports.deleteTimeSlot = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('일정 삭제 요청');
    }
    
    const timeSlot = await TimeSlot.findById(req.params.id);

    if (!timeSlot) {
      if (process.env.NODE_ENV === 'development') {
        console.log('일정을 찾을 수 없음');
      }
      return res.status(404).json({
        success: false,
        message: `Time slot not found with id of ${req.params.id}`
      });
    }

    // remove() 대신 deleteOne() 사용 (최신 Mongoose 버전 호환)
    await TimeSlot.deleteOne({ _id: req.params.id });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('일정 삭제 성공');
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('일정 삭제 오류:', err);
    res.status(500).json({
      success: false,
      message: `서버 오류: ${err.message}`
    });
  }
}; 