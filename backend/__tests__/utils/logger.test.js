const winston = require('winston');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

// Mock winston to capture log calls
const mockWinston = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock fs to avoid file operations during tests
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

describe('Logger Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Spy on winston methods
    jest.spyOn(logger, 'info').mockImplementation(mockWinston.info);
    jest.spyOn(logger, 'warn').mockImplementation(mockWinston.warn);
    jest.spyOn(logger, 'error').mockImplementation(mockWinston.error);
    jest.spyOn(logger, 'debug').mockImplementation(mockWinston.debug);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Logging Functions', () => {
    test('info 로그 기능', () => {
      const message = '테스트 정보 메시지';
      const data = { userId: 'test123' };

      logger.info(message, data);

      expect(mockWinston.info).toHaveBeenCalledWith(message, data);
    });

    test('warn 로그 기능', () => {
      const message = '테스트 경고 메시지';
      const data = { warning: 'test warning' };

      logger.warn(message, data);

      expect(mockWinston.warn).toHaveBeenCalledWith(message, data);
    });

    test('error 로그 기능', () => {
      const message = '테스트 에러 메시지';
      const data = { error: 'test error' };

      logger.error(message, data);

      expect(mockWinston.error).toHaveBeenCalledWith(message, data);
    });

    test('debug 로그 기능', () => {
      const message = '테스트 디버그 메시지';
      const data = { debug: 'test debug' };

      logger.debug(message, data);

      expect(mockWinston.debug).toHaveBeenCalledWith(message, data);
    });
  });

  describe('logRequest middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent')
      };
      
      mockRes = {
        statusCode: 200,
        on: jest.fn()
      };
      
      mockNext = jest.fn();
    });

    test('HTTP 요청 로깅 미들웨어 설정', () => {
      logger.logRequest(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    test('성공적인 HTTP 요청 로깅 (200 상태)', () => {
      let finishCallback;
      
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      logger.logRequest(mockReq, mockRes, mockNext);
      
      // finish 이벤트 시뮬레이션
      finishCallback();

      expect(mockWinston.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          ip: '127.0.0.1',
          userAgent: 'test-user-agent',
          duration: expect.stringMatching(/\d+ms/)
        })
      );
    });

    test('에러 HTTP 요청 로깅 (400+ 상태)', () => {
      mockRes.statusCode = 404;
      let finishCallback;
      
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      logger.logRequest(mockReq, mockRes, mockNext);
      
      // finish 이벤트 시뮬레이션
      finishCallback();

      expect(mockWinston.warn).toHaveBeenCalledWith(
        'HTTP Request Error',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          statusCode: 404,
          ip: '127.0.0.1'
        })
      );
    });
  });

  describe('logError function', () => {
    test('기본 에러 로깅', () => {
      const error = new Error('테스트 에러');
      
      logger.logError(error);

      expect(mockWinston.error).toHaveBeenCalledWith(
        'Application Error',
        expect.objectContaining({
          message: '테스트 에러',
          stack: expect.any(String)
        })
      );
    });

    test('요청 정보 포함 에러 로깅', () => {
      const error = new Error('요청 에러');
      const mockReq = {
        method: 'POST',
        url: '/api/test',
        body: { test: 'data' },
        params: { id: '123' },
        query: { filter: 'active' },
        user: { studentId: 'student123' }
      };
      
      logger.logError(error, mockReq);

      expect(mockWinston.error).toHaveBeenCalledWith(
        'Application Error',
        expect.objectContaining({
          message: '요청 에러',
          stack: expect.any(String),
          method: 'POST',
          url: '/api/test',
          body: { test: 'data' },
          params: { id: '123' },
          query: { filter: 'active' },
          user: 'student123'
        })
      );
    });

    test('사용자 정보 없는 요청 에러 로깅', () => {
      const error = new Error('인증 없는 요청 에러');
      const mockReq = {
        method: 'GET',
        url: '/api/protected',
        body: {},
        params: {},
        query: {}
      };
      
      logger.logError(error, mockReq);

      expect(mockWinston.error).toHaveBeenCalledWith(
        'Application Error',
        expect.objectContaining({
          message: '인증 없는 요청 에러',
          method: 'GET',
          url: '/api/protected',
          user: undefined
        })
      );
    });
  });

  describe('logAuth function', () => {
    test('성공적인 인증 로깅', () => {
      logger.logAuth('login', 'student123', true, { ip: '127.0.0.1' });

      expect(mockWinston.info).toHaveBeenCalledWith(
        'Auth Success',
        expect.objectContaining({
          action: 'login',
          studentId: 'student123',
          success: true,
          ip: '127.0.0.1',
          timestamp: expect.any(String)
        })
      );
    });

    test('실패한 인증 로깅', () => {
      logger.logAuth('login', 'student123', false, { reason: 'wrong password' });

      expect(mockWinston.warn).toHaveBeenCalledWith(
        'Auth Failed',
        expect.objectContaining({
          action: 'login',
          studentId: 'student123',
          success: false,
          reason: 'wrong password',
          timestamp: expect.any(String)
        })
      );
    });

    test('추가 정보 없는 인증 로깅', () => {
      logger.logAuth('logout', 'student456', true);

      expect(mockWinston.info).toHaveBeenCalledWith(
        'Auth Success',
        expect.objectContaining({
          action: 'logout',
          studentId: 'student456',
          success: true,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('logSeatAction function', () => {
    const mockSeatInfo = {
      number: 'A01',
      section: 'A'
    };
    
    const mockUser = {
      studentId: 'student123'
    };

    test('성공적인 좌석 액션 로깅', () => {
      logger.logSeatAction('assign', mockSeatInfo, mockUser, true, { 
        timeSlot: 'spring2024' 
      });

      expect(mockWinston.info).toHaveBeenCalledWith(
        'Seat Action Success',
        expect.objectContaining({
          action: 'assign',
          seat: 'A01-A',
          user: 'student123',
          success: true,
          timeSlot: 'spring2024',
          timestamp: expect.any(String)
        })
      );
    });

    test('실패한 좌석 액션 로깅', () => {
      logger.logSeatAction('assign', mockSeatInfo, mockUser, false, { 
        reason: 'seat already taken' 
      });

      expect(mockWinston.warn).toHaveBeenCalledWith(
        'Seat Action Failed',
        expect.objectContaining({
          action: 'assign',
          seat: 'A01-A',
          user: 'student123',
          success: false,
          reason: 'seat already taken',
          timestamp: expect.any(String)
        })
      );
    });

    test('추가 정보 없는 좌석 액션 로깅', () => {
      logger.logSeatAction('release', mockSeatInfo, mockUser, true);

      expect(mockWinston.info).toHaveBeenCalledWith(
        'Seat Action Success',
        expect.objectContaining({
          action: 'release',
          seat: 'A01-A',
          user: 'student123',
          success: true,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Log Directory Creation', () => {
    test('로그 디렉토리가 존재하지 않을 때 생성', () => {
      // fs.existsSync가 false를 반환하도록 설정
      fs.existsSync.mockReturnValue(false);
      
      // 모듈을 다시 로드하여 디렉토리 생성 로직 실행
      jest.resetModules();
      require('../../utils/logger');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });

    test('로그 디렉토리가 이미 존재할 때 생성하지 않음', () => {
      fs.existsSync.mockReturnValue(true);
      
      jest.resetModules();
      require('../../utils/logger');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Logger Configuration', () => {
    test('logger가 winston 인스턴스인지 확인', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('헬퍼 함수들이 정의되어 있는지 확인', () => {
      expect(typeof logger.logRequest).toBe('function');
      expect(typeof logger.logError).toBe('function');
      expect(typeof logger.logAuth).toBe('function');
      expect(typeof logger.logSeatAction).toBe('function');
    });
  });
}); 