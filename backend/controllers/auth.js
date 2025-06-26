const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { studentId, name, birthdate } = req.body;
    console.log('Login attempt:', { studentId, name, birthdate });
    console.log('요청 데이터 타입:', {
      studentIdType: typeof studentId,
      nameType: typeof name,
      birthdateType: typeof birthdate
    });
    
    // 검증 - 생년월일은 선택사항
    if (!studentId || !name) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide student ID and name'
      });
    }

    // 사용자 찾기
    const user = await User.findOne({ studentId });
    console.log('User found:', user);

    if (!user) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 이름 확인
    console.log('Comparing names:', { 
      dbName: user.name, 
      inputName: name
    });
    
    if (user.name !== name) {
      console.log('Name mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 생년월일이 제공된 경우에만 확인 (기존 사용자 호환성)
    if (birthdate && user.birthdate && user.birthdate.trim() !== '') {
      console.log('Checking birthdate:', { 
        dbBirthdate: user.birthdate, 
        inputBirthdate: birthdate 
      });
      
      if (user.birthdate !== birthdate) {
        console.log('Birthdate mismatch');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }

    // 여기까지 왔다면 성공
    console.log('Login successful');
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error details:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ studentId: req.user.studentId });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign(
    { id: user.studentId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      studentId: user.studentId,
      name: user.name,
      priority: user.priority,
      isAdmin: user.isAdmin
    }
  });
}; 