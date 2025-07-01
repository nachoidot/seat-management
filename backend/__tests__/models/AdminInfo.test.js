const AdminInfo = require('../../models/AdminInfo');
require('../setup');

describe('AdminInfo Model', () => {
  
  describe('AdminInfo Schema Validation', () => {
    test('올바른 관리자 정보로 생성 성공', async () => {
      const adminData = {
        name: '김관리자',
        phone: '02-1234-5678',
        email: 'admin@test.com',
        department: '컴퓨터공학과',
        position: '실습조교'
      };

      const adminInfo = new AdminInfo(adminData);
      const savedAdminInfo = await adminInfo.save();

      expect(savedAdminInfo.name).toBe(adminData.name);
      expect(savedAdminInfo.phone).toBe(adminData.phone);
      expect(savedAdminInfo.email).toBe(adminData.email);
      expect(savedAdminInfo.department).toBe(adminData.department);
      expect(savedAdminInfo.position).toBe(adminData.position);
      expect(savedAdminInfo.createdAt).toBeDefined();
      expect(savedAdminInfo.updatedAt).toBeDefined();
    });

    test('필수 필드 없이 생성 시 기본값 사용', async () => {
      const adminInfo = new AdminInfo({});
      const savedAdminInfo = await adminInfo.save();

      expect(savedAdminInfo.name).toBe('관리자'); // 기본값
      expect(savedAdminInfo.phone).toBe('02-0000-0000'); // 기본값
      expect(savedAdminInfo.email).toBe('admin@sogang.ac.kr'); // 기본값
      expect(savedAdminInfo.department).toBe('경제학과'); // 기본값
      expect(savedAdminInfo.position).toBe('주임조교'); // 기본값
    });
  });

  describe('Default Values', () => {
    test('모든 기본값 확인', async () => {
      const adminInfo = new AdminInfo({});
      await adminInfo.save();

      expect(adminInfo.name).toBe('관리자');
      expect(adminInfo.phone).toBe('02-0000-0000');
      expect(adminInfo.email).toBe('admin@sogang.ac.kr');
      expect(adminInfo.department).toBe('경제학과');
      expect(adminInfo.position).toBe('주임조교');
      expect(adminInfo.createdAt).toBeDefined();
      expect(adminInfo.updatedAt).toBeDefined();
    });

    test('부분 필드만 설정 시 나머지는 기본값', async () => {
      const adminInfo = new AdminInfo({
        name: '커스텀 관리자',
        email: 'custom@test.com'
      });
      await adminInfo.save();

      expect(adminInfo.name).toBe('커스텀 관리자');
      expect(adminInfo.email).toBe('custom@test.com');
      expect(adminInfo.phone).toBe('02-0000-0000'); // 기본값
      expect(adminInfo.department).toBe('경제학과'); // 기본값
      expect(adminInfo.position).toBe('주임조교'); // 기본값
    });
  });

  describe('Text Field Trimming', () => {
    test('이름의 공백 제거', async () => {
      const adminInfo = new AdminInfo({
        name: '  공백포함이름  '
      });
      await adminInfo.save();

      expect(adminInfo.name).toBe('공백포함이름');
    });

    test('전화번호의 공백 제거', async () => {
      const adminInfo = new AdminInfo({
        phone: '  02-1234-5678  '
      });
      await adminInfo.save();

      expect(adminInfo.phone).toBe('02-1234-5678');
    });

    test('이메일의 공백 제거', async () => {
      const adminInfo = new AdminInfo({
        email: '  test@example.com  '
      });
      await adminInfo.save();

      expect(adminInfo.email).toBe('test@example.com');
    });

    test('부서의 공백 제거', async () => {
      const adminInfo = new AdminInfo({
        department: '  컴퓨터공학과  '
      });
      await adminInfo.save();

      expect(adminInfo.department).toBe('컴퓨터공학과');
    });

    test('직책의 공백 제거', async () => {
      const adminInfo = new AdminInfo({
        position: '  실습조교  '
      });
      await adminInfo.save();

      expect(adminInfo.position).toBe('실습조교');
    });
  });

  describe('updatedAt Auto Update', () => {
    test('저장 시 updatedAt 자동 갱신', async () => {
      const adminInfo = new AdminInfo({
        name: '테스트 관리자'
      });
      
      const savedInfo = await adminInfo.save();
      const initialUpdatedAt = savedInfo.updatedAt;

      // 잠시 대기 후 수정
      await new Promise(resolve => setTimeout(resolve, 10));
      
      savedInfo.name = '수정된 관리자';
      await savedInfo.save();

      expect(savedInfo.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    test('생성 시 createdAt과 updatedAt 동일', async () => {
      const adminInfo = new AdminInfo({
        name: '새 관리자'
      });
      
      await adminInfo.save();

      // 밀리초 차이는 허용
      const timeDiff = Math.abs(adminInfo.updatedAt.getTime() - adminInfo.createdAt.getTime());
      expect(timeDiff).toBeLessThan(1000); // 1초 미만
    });
  });

  describe('Data Validation', () => {
    test('빈 문자열도 허용', async () => {
      const adminInfo = new AdminInfo({
        name: '',
        phone: '',
        email: '',
        department: '',
        position: ''
      });

      await expect(adminInfo.save()).resolves.toBeDefined();
    });

    test('매우 긴 문자열 저장', async () => {
      const longString = 'A'.repeat(1000);
      
      const adminInfo = new AdminInfo({
        name: longString,
        department: longString,
        position: longString
      });

      await expect(adminInfo.save()).resolves.toBeDefined();
      expect(adminInfo.name).toBe(longString);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // 테스트용 데이터 준비
      await AdminInfo.create([
        {
          name: '관리자1',
          email: 'admin1@test.com',
          department: '컴퓨터공학과'
        },
        {
          name: '관리자2',
          email: 'admin2@test.com',
          department: '전자공학과'
        }
      ]);
    });

    test('이름으로 검색', async () => {
      const admin = await AdminInfo.findOne({ name: '관리자1' });
      
      expect(admin).toBeDefined();
      expect(admin.name).toBe('관리자1');
      expect(admin.email).toBe('admin1@test.com');
    });

    test('부서로 검색', async () => {
      const admins = await AdminInfo.find({ 
        department: { $regex: '공학과', $options: 'i' } 
      });
      
      expect(admins).toHaveLength(2);
    });

    test('정보 업데이트', async () => {
      const admin = await AdminInfo.findOne({ name: '관리자1' });
      const oldUpdatedAt = admin.updatedAt;
      
      admin.position = '수석조교';
      await admin.save();
      
      expect(admin.position).toBe('수석조교');
      expect(admin.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });
  });

  describe('Collection Name', () => {
    test('올바른 컬렉션 이름 사용', () => {
      expect(AdminInfo.collection.name).toBe('admininfo');
    });
  });
}); 