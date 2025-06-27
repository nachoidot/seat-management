const winston = require('winston');
const path = require('path');

// 로그 디렉토리 생성
const logDir = path.join(__dirname, '../logs');

// 환경별 로그 레벨 설정
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// 커스텀 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// 개발환경용 콘솔 포맷
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta, null, 2);
    }
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Winston 로거 설정
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'seat-management-api' },
  transports: [
    // 에러 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 모든 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 개발 환경에서는 콘솔에도 출력
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 프로덕션 환경에서는 중요한 로그만 콘솔 출력
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    level: 'warn',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    )
  }));
}

// 로그 디렉토리 생성 (동기적으로)
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 헬퍼 함수들
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    ...(req && {
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user?.studentId,
    })
  };
  
  logger.error('Application Error', errorData);
};

logger.logAuth = (action, studentId, success, details = {}) => {
  const logData = {
    action,
    studentId,
    success,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  if (success) {
    logger.info('Auth Success', logData);
  } else {
    logger.warn('Auth Failed', logData);
  }
};

logger.logSeatAction = (action, seatInfo, user, success, details = {}) => {
  const logData = {
    action,
    seat: `${seatInfo.number}-${seatInfo.section}`,
    user: user.studentId,
    success,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  if (success) {
    logger.info('Seat Action Success', logData);
  } else {
    logger.warn('Seat Action Failed', logData);
  }
};

module.exports = logger; 