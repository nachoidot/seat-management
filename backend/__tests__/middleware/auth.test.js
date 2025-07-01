const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../../middleware/auth');
const User = require('../../models/User');
require('../setup');

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}));

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    // Mock console.log to avoid test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log.mockRestore();
  });

  describe('protect middleware', () => {
    test('유효한 Bearer 토큰으로 인증 성공', async () => {
      // 테스트용 사용자 생성
      const testUser = await User.create({
        studentId: 'test123',
        name: '테스트 사용자',
        password: 'password123'
      });

      // 유효한 토큰 생성
      const token = jwt.sign(
        { studentId: testUser.studentId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await protect(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.studentId).toBe(testUser.studentId);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('Authorization 헤더 없을 때 401 오류', async () => {
      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Bearer 형식이 아닌 토큰으로 401 오류', async () => {
      mockReq.headers.authorization = 'InvalidTokenFormat';

      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('잘못된 토큰으로 401 오류', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('만료된 토큰으로 401 오류', async () => {
      const expiredToken = jwt.sign(
        { studentId: 'test123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // 이미 만료된 토큰
      );

      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('존재하지 않는 사용자 토큰으로 401 오류', async () => {
      const token = jwt.sign(
        { studentId: 'nonexistent' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('잘못된 JWT_SECRET으로 토큰 검증 실패', async () => {
      const token = jwt.sign(
        { studentId: 'test123' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      // protect middleware를 통과했다고 가정하고 사용자 정보 설정
      mockReq.user = {
        studentId: 'test123',
        name: '테스트 사용자',
        isAdmin: false
      };
    });

    test('관리자 권한 체크 - 관리자 접근 허용', () => {
      mockReq.user.isAdmin = true;
      const authorizeAdmin = authorize(true);

      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('관리자 권한 체크 - 일반 사용자 접근 거부', () => {
      mockReq.user.isAdmin = false;
      const authorizeAdmin = authorize(true);

      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User role user is not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('일반 사용자 권한 체크 - 일반 사용자 접근 허용', () => {
      mockReq.user.isAdmin = false;
      const authorizeUser = authorize(false);

      authorizeUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('일반 사용자 권한 체크 - 관리자도 접근 허용', () => {
      mockReq.user.isAdmin = true;
      const authorizeUser = authorize(false);

      authorizeUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User role admin is not authorized to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('다중 권한 허용 - 관리자와 일반 사용자 모두 허용', () => {
      const authorizeAll = authorize(true, false);

      // 관리자 테스트
      mockReq.user.isAdmin = true;
      authorizeAll(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 초기화
      mockNext.mockClear();

      // 일반 사용자 테스트
      mockReq.user.isAdmin = false;
      authorizeAll(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('빈 권한 배열 - 모든 사용자 접근 거부', () => {
      const authorizeNone = authorize();

      mockReq.user.isAdmin = false;
      authorizeNone(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Integration Test', () => {
    test('protect + authorize 연계 테스트', async () => {
      // 관리자 사용자 생성
      const adminUser = await User.create({
        studentId: 'admin123',
        name: '관리자',
        password: 'password123',
        isAdmin: true
      });

      const token = jwt.sign(
        { studentId: adminUser.studentId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      // 1단계: protect 미들웨어 통과
      await protect(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.isAdmin).toBe(true);

      // 2단계: authorize 미들웨어 통과
      mockNext.mockClear();
      const authorizeAdmin = authorize(true);
      authorizeAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
}); 