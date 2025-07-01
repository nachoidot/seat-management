const bcrypt = require('bcryptjs');
const User = require('../../models/User');
require('../setup');

describe('User Model', () => {
  
  describe('User Schema Validation', () => {
    test('올바른 사용자 데이터로 사용자 생성 성공', async () => {
      const userData = {
        studentId: 'test123',
        name: '테스트 사용자',
        password: 'password123',
        birthdate: '19990101',
        priority: 2,
        isAdmin: false
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.studentId).toBe(userData.studentId);
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.birthdate).toBe(userData.birthdate);
      expect(savedUser.priority).toBe(userData.priority);
      expect(savedUser.isAdmin).toBe(userData.isAdmin);
      expect(savedUser.createdAt).toBeDefined();
    });

    test('필수 필드 누락 시 검증 오류', async () => {
      const user = new User({});
      
      await expect(user.save()).rejects.toThrow();
    });

    test('중복된 studentId로 사용자 생성 시 오류', async () => {
      const userData = {
        studentId: 'duplicate123',
        name: '첫번째 사용자',
        password: 'password123'
      };

      await User.create(userData);

      const duplicateUser = new User({
        studentId: 'duplicate123',
        name: '두번째 사용자',
        password: 'password456'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    test('우선순위 범위 검증', async () => {
      const invalidUser = new User({
        studentId: 'test456',
        name: '테스트',
        password: 'password123',
        priority: 15 // 유효 범위: 1-12
      });

      await expect(invalidUser.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    test('비밀번호가 자동으로 해시화됨', async () => {
      const plainPassword = 'plainPassword123';
      const user = new User({
        studentId: 'test789',
        name: '테스트 사용자',
        password: plainPassword
      });

      await user.save();

      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    test('비밀번호가 수정되지 않았으면 다시 해시화되지 않음', async () => {
      const user = new User({
        studentId: 'test101',
        name: '테스트 사용자',
        password: 'password123'
      });

      await user.save();
      const originalHash = user.password;

      user.name = '수정된 이름';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('matchPassword Method', () => {
    test('올바른 비밀번호 매칭', async () => {
      const plainPassword = 'correctPassword';
      const user = new User({
        studentId: 'test202',
        name: '테스트 사용자',
        password: plainPassword
      });

      await user.save();

      const isMatch = await user.matchPassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    test('잘못된 비밀번호 매칭', async () => {
      const user = new User({
        studentId: 'test303',
        name: '테스트 사용자',
        password: 'correctPassword'
      });

      await user.save();

      const isMatch = await user.matchPassword('wrongPassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('Virtual Properties', () => {
    test('fullName virtual property', () => {
      const user = new User({
        studentId: 'test404',
        name: '홍길동',
        password: 'password123'
      });

      expect(user.fullName).toBe('홍길동');
    });
  });

  describe('Default Values', () => {
    test('기본값 설정 확인', async () => {
      const user = new User({
        studentId: 'test505',
        name: '테스트 사용자',
        password: 'password123'
      });

      await user.save();

      expect(user.priority).toBe(3); // 기본값
      expect(user.isAdmin).toBe(false); // 기본값
      expect(user.birthdate).toBe(''); // 기본값
      expect(user.createdAt).toBeDefined();
    });
  });
}); 