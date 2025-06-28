const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  // Set token from cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    console.log(`JWT BEARER: Token Not FOUND`);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`JWT BEARER: decoded: ${decoded}`);

    // auth.js에서 studentId로 토큰을 생성했으므로 decoded.studentId 사용
    const user = await User.findOne({ studentId: decoded.studentId });
    console.log(`JWT BEARER: user:`);
    console.log(user);

    if (!user) {
      logger.warn('User not found with decoded studentId', {
        studentId: decoded.studentId,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.log(`JWT BEARER: Try catch error: ${err}`);

    logger.warn('JWT verification failed', {
      error: err.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource',
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.isAdmin)) {
      return res.status(403).json({
        success: false,
        message: `User role ${
          req.user.isAdmin ? 'admin' : 'user'
        } is not authorized to access this resource`,
      });
    }
    next();
  };
};
