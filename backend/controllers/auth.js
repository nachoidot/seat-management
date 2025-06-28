const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { studentId, name, password } = req.body;
    console.log('나여기 있다!!!');
    console.log(studentId, name, password);

    if (!studentId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student ID and name',
      });
    }

    // Find user by student ID and name
    let user = await User.findOne({ studentId, name }).select('+password');

    if (!user) {
      logger.logAuth('login', studentId, false, {
        reason: 'user_not_found',
        name,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // 새로운 비밀번호 시스템 대응
    if (password) {
      // 비밀번호가 제공된 경우
      if (!user.password) {
        // 사용자에게 비밀번호가 설정되어 있지 않은 경우
        logger.logAuth('login', studentId, false, {
          reason: 'no_password_set',
          name,
        });
        return res.status(401).json({
          success: false,
          message:
            'Password not set for this user. Please contact administrator.',
        });
      }

      // 비밀번호 검증
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        logger.logAuth('login', studentId, false, {
          reason: 'invalid_password',
          name,
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }
    } else {
      // 비밀번호가 제공되지 않은 경우 (기존 사용자 호환)
      if (user.password) {
        // 사용자에게 비밀번호가 설정되어 있는 경우 비밀번호 필요
        logger.logAuth('login', studentId, false, {
          reason: 'password_required',
          name,
        });
        return res.status(401).json({
          success: false,
          message: 'Password required for login',
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { studentId: user.studentId, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // HttpOnly 쿠키로 JWT 설정 (보안 강화)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    });

    logger.logAuth('login', studentId, true, { name, isAdmin: user.isAdmin });

    res.status(200).json({
      success: true,
      user: {
        studentId: user.studentId,
        name: user.name,
        isAdmin: user.isAdmin,
        priority: user.priority,
      },
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ studentId: req.user.studentId });

    if (!user) {
      logger.warn('User not found in getMe', { studentId: req.user.studentId });
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        studentId: user.studentId,
        name: user.name,
        isAdmin: user.isAdmin,
        priority: user.priority,
      },
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Logout user and clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // 쿠키 완전 삭제
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10초 후 만료
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    });

    logger.logAuth('logout', req.user?.studentId || 'unknown', true);

    res.status(200).json({
      success: true,
      message: 'User logged out successfully',
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 입력값 검증
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    // 사용자 찾기 (비밀번호 포함)
    const user = await User.findOne({ studentId: req.user.studentId }).select(
      '+password'
    );

    if (!user) {
      logger.warn('User not found in changePassword', {
        studentId: req.user.studentId,
      });
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // 기존 비밀번호 확인 (비밀번호가 설정되어 있는 경우만)
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required',
        });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        logger.logAuth('change_password', req.user.studentId, false, {
          reason: 'invalid_current_password',
        });
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
    }

    // 새 비밀번호 설정
    user.password = newPassword;
    await user.save();

    logger.logAuth('change_password', req.user.studentId, true);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    logger.logError(err, req);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
