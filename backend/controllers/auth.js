const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { studentId, name, password, birthdate } = req.body;
    
    // 검증 - password는 필수, 생년월일은 선택사항
    if (!studentId || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student ID, name and password'
      });
    }

    // 사용자 찾기 (비밀번호 포함)
    const user = await User.findOne({ studentId }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 이름 확인
    if (user.name !== name) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 비밀번호 확인
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 생년월일이 제공된 경우에만 확인 (기존 사용자 호환성)
    if (birthdate && user.birthdate && user.birthdate.trim() !== '') {
      if (user.birthdate !== birthdate) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }

    // 로그인 성공
    sendTokenResponse(user, 200, res);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', err);
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
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
    if (process.env.NODE_ENV === 'development') {
      console.error('GetMe error:', err);
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
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

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict' // Cross-origin 요청을 위해 production에서는 'none'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      user: {
        studentId: user.studentId,
        name: user.name,
        priority: user.priority,
        isAdmin: user.isAdmin
      }
    });
}; 