const { login, getMe, logout, changePassword } = require('../../controllers/auth');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
require('../setup');

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logAuth: jest.fn(),
  logError: jest.fn(),
  warn: jest.fn()
}));

describe('Auth Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('유효한 자격 증명으로 로그인 성공', async () => {
      const testUser = await User.create({
        studentId: 'test123',
        name: '테스트사용자',
        isAdmin: false,
        priority: 2
      });

      mockReq.body = {
        studentId: 'test123',
        name: '테스트사용자'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        token: expect.any(String),
        user: {
          studentId: 'test123',
          name: '테스트사용자',
          isAdmin: false,
          priority: 2
        }
      });
    });

    test('학번 누락 시 400 오류', async () => {
      mockReq.body = {
        name: '테스트사용자'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please provide student ID and name'
      });
    });

    test('유효한 자격 증명으로 로그인 성공 (비밀번호 있는 사용자)', async () => {
      const testUser = await User.create({
        studentId: 'test456',
        name: '테스트사용자2',
        password: 'password123',
        isAdmin: false,
        priority: 2
      });

      mockReq.body = {
        studentId: 'test456',
        name: '테스트사용자2',
        password: 'password123'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        token: expect.any(String),
        user: expect.objectContaining({
          studentId: 'test456',
          name: '테스트사용자2'
        })
      });
    });

    test('존재하지 않는 사용자로 로그인 시 401 오류', async () => {
      mockReq.body = {
        studentId: 'nonexistent',
        name: '존재하지않는사용자'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    test('잘못된 비밀번호로 로그인 시 401 오류', async () => {
      await User.create({
        studentId: 'test789',
        name: '테스트사용자3',
        password: 'correctpassword'
      });

      mockReq.body = {
        studentId: 'test789',
        name: '테스트사용자3',
        password: 'wrongpassword'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    test('비밀번호가 설정된 사용자가 비밀번호 없이 로그인 시 401 오류', async () => {
      await User.create({
        studentId: 'test101',
        name: '테스트사용자4',
        password: 'password123'
      });

      mockReq.body = {
        studentId: 'test101',
        name: '테스트사용자4'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password required for login'
      });
    });

    test('비밀번호가 설정되지 않은 사용자가 비밀번호와 함께 로그인 시 401 오류', async () => {
      await User.create({
        studentId: 'test202',
        name: '테스트사용자5'
      });

      mockReq.body = {
        studentId: 'test202',
        name: '테스트사용자5',
        password: 'somepassword'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password not set for this user. Please contact administrator.'
      });
    });

    test('관리자 사용자 로그인 성공', async () => {
      await User.create({
        studentId: 'admin123',
        name: '관리자',
        password: 'adminpass',
        isAdmin: true
      });

      mockReq.body = {
        studentId: 'admin123',
        name: '관리자',
        password: 'adminpass'
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        token: expect.any(String),
        user: expect.objectContaining({
          isAdmin: true
        })
      });
    });
  });

  describe('getMe', () => {
    test('인증된 사용자 정보 조회 성공', async () => {
      const testUser = await User.create({
        studentId: 'test303',
        name: '테스트사용자6',
        isAdmin: false,
        priority: 2
      });

      mockReq.user = { studentId: 'test303' };

      await getMe(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: {
          studentId: 'test303',
          name: '테스트사용자6',
          isAdmin: false,
          priority: 2
        }
      });
    });

    test('존재하지 않는 사용자 정보 조회 시 404 오류', async () => {
      mockReq.user = { studentId: 'nonexistent' };

      await getMe(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('logout', () => {
    test('로그아웃 성공', async () => {
      mockReq.user = { studentId: 'test404' };

      await logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User logged out successfully'
      });
    });

    test('사용자 정보 없이 로그아웃', async () => {
      mockReq.user = null;

      await logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User logged out successfully'
      });
    });
  });

  describe('changePassword', () => {
    test('비밀번호 변경 성공 (기존 비밀번호 있음)', async () => {
      const testUser = await User.create({
        studentId: 'test505',
        name: '테스트사용자7',
        password: 'oldpassword'
      });

      mockReq.user = { studentId: 'test505' };
      mockReq.body = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      await changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully'
      });

      // 비밀번호가 실제로 변경되었는지 확인
      const updatedUser = await User.findOne({ studentId: 'test505' }).select('+password');
      const isNewPasswordValid = await updatedUser.matchPassword('newpassword123');
      expect(isNewPasswordValid).toBe(true);
    });

    test('비밀번호 변경 성공 (기존 비밀번호 없음)', async () => {
      const testUser = await User.create({
        studentId: 'test606',
        name: '테스트사용자8'
      });

      mockReq.user = { studentId: 'test606' };
      mockReq.body = {
        newPassword: 'newpassword123'
      };

      await changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully'
      });
    });

    test('새 비밀번호가 너무 짧을 때 400 오류', async () => {
      mockReq.user = { studentId: 'test707' };
      mockReq.body = {
        newPassword: '123'
      };

      await changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    });

    test('새 비밀번호 누락 시 400 오류', async () => {
      mockReq.user = { studentId: 'test808' };
      mockReq.body = {};

      await changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    });

    test('현재 비밀번호 누락 시 400 오류 (기존 비밀번호 있는 경우)', async () => {
      await User.create({
        studentId: 'test909',
        name: '테스트사용자9',
        password: 'existingpassword'
      });

      mockReq.user = { studentId: 'test909' };
      mockReq.body = {
        newPassword: 'newpassword123'
      };

      await changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password is required'
      });
    });

    test('잘못된 현재 비밀번호로 변경 시 401 오류', async () => {
      await User.create({
        studentId: 'test1010',
        name: '테스트사용자10',
        password: 'correctpassword'
      });

      mockReq.user = { studentId: 'test1010' };
      mockReq.body = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      await changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password is incorrect'
      });
    });

    test('존재하지 않는 사용자의 비밀번호 변경 시 404 오류', async () => {
      mockReq.user = { studentId: 'nonexistent' };
      mockReq.body = {
        newPassword: 'newpassword123'
      };

      await changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('JWT Token Generation', () => {
    test('생성된 토큰이 유효한지 확인', async () => {
      const testUser = await User.create({
        studentId: 'token123',
        name: '토큰테스트',
        isAdmin: false
      });

      mockReq.body = {
        studentId: 'token123',
        name: '토큰테스트'
      };

      await login(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      const token = response.token;

      // 토큰 검증
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.studentId).toBe('token123');
      expect(decoded.isAdmin).toBe(false);
    });
  });
}); 