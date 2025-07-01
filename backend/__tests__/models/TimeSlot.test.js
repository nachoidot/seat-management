const TimeSlot = require('../../models/TimeSlot');
require('../setup');

describe('TimeSlot Model', () => {
  
  describe('TimeSlot Schema Validation', () => {
    test('올바른 일정 데이터로 일정 생성 성공', async () => {
      const timeSlotData = {
        title: '2024년 1학기 좌석 배정',
        description: '2024년 1학기 대학원생 좌석 배정 기간입니다.',
        baseDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30')
      };

      const timeSlot = new TimeSlot(timeSlotData);
      const savedTimeSlot = await timeSlot.save();

      expect(savedTimeSlot.title).toBe(timeSlotData.title);
      expect(savedTimeSlot.description).toBe(timeSlotData.description);
      expect(savedTimeSlot.baseDate).toEqual(timeSlotData.baseDate);
      expect(savedTimeSlot.endDate).toEqual(timeSlotData.endDate);
      expect(savedTimeSlot.createdAt).toBeDefined();
    });

    test('필수 필드 누락 시 검증 오류', async () => {
      const timeSlot = new TimeSlot({});
      
      await expect(timeSlot.save()).rejects.toThrow();
    });

    test('제목 없이 일정 생성 시 오류', async () => {
      const timeSlot = new TimeSlot({
        description: '설명만 있는 일정',
        baseDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30')
      });

      await expect(timeSlot.save()).rejects.toThrow(/일정 제목을 입력해주세요/);
    });

    test('배정 시작일 없이 일정 생성 시 오류', async () => {
      const timeSlot = new TimeSlot({
        title: '테스트 일정',
        description: '시작일이 없는 일정',
        endDate: new Date('2024-06-30')
      });

      await expect(timeSlot.save()).rejects.toThrow(/배정 시작일을 입력해주세요/);
    });

    test('배정 종료일 없이 일정 생성 시 오류', async () => {
      const timeSlot = new TimeSlot({
        title: '테스트 일정',
        description: '종료일이 없는 일정',
        baseDate: new Date('2024-03-01')
      });

      await expect(timeSlot.save()).rejects.toThrow(/배정 종료일을 입력해주세요/);
    });
  });

  describe('Default Values', () => {
    test('기본값 설정 확인', async () => {
      const timeSlot = new TimeSlot({
        title: '테스트 일정',
        baseDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30')
      });

      await timeSlot.save();

      expect(timeSlot.active).toBe(true); // 기본값
      expect(timeSlot.createdAt).toBeDefined();
    });

    test('description이 선택 사항임을 확인', async () => {
      const timeSlot = new TimeSlot({
        title: '설명 없는 일정',
        baseDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30')
      });

      await expect(timeSlot.save()).resolves.toBeDefined();
      expect(timeSlot.description).toBeUndefined();
    });
  });

  describe('Date Management', () => {
    test('유효한 날짜 범위 설정', async () => {
      const baseDate = new Date('2024-03-01');
      const endDate = new Date('2024-06-30');
      
      const timeSlot = new TimeSlot({
        title: '유효한 날짜 범위',
        baseDate: baseDate,
        endDate: endDate
      });

      await timeSlot.save();

      expect(timeSlot.baseDate).toEqual(baseDate);
      expect(timeSlot.endDate).toEqual(endDate);
    });

    test('시작일과 종료일이 같은 경우', async () => {
      const sameDate = new Date('2024-03-01');
      
      const timeSlot = new TimeSlot({
        title: '단일 날짜 일정',
        baseDate: sameDate,
        endDate: sameDate
      });

      await expect(timeSlot.save()).resolves.toBeDefined();
    });
  });

  describe('Text Field Trimming', () => {
    test('제목의 공백 제거', async () => {
      const timeSlot = new TimeSlot({
        title: '  공백이 있는 제목  ',
        baseDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30')
      });

      await timeSlot.save();

      expect(timeSlot.title).toBe('공백이 있는 제목');
    });

    test('설명의 공백 제거', async () => {
      const timeSlot = new TimeSlot({
        title: '테스트 일정',
        description: '  공백이 있는 설명  ',
        baseDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30')
      });

      await timeSlot.save();

      expect(timeSlot.description).toBe('공백이 있는 설명');
    });
  });

  describe('Active Status Management', () => {
    test('일정 활성/비활성 상태 변경', async () => {
      const timeSlot = await TimeSlot.create({
        title: '상태 변경 테스트',
        baseDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30'),
        active: true
      });

      expect(timeSlot.active).toBe(true);

      timeSlot.active = false;
      await timeSlot.save();

      expect(timeSlot.active).toBe(false);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // 테스트용 데이터 준비
      await TimeSlot.create([
        {
          title: '활성 일정 1',
          baseDate: new Date('2024-03-01'),
          endDate: new Date('2024-06-30'),
          active: true
        },
        {
          title: '비활성 일정',
          baseDate: new Date('2024-01-01'),
          endDate: new Date('2024-02-28'),
          active: false
        },
        {
          title: '활성 일정 2',
          baseDate: new Date('2024-07-01'),
          endDate: new Date('2024-12-31'),
          active: true
        }
      ]);
    });

    test('활성 일정만 조회', async () => {
      const activeTimeSlots = await TimeSlot.find({ active: true });
      
      expect(activeTimeSlots).toHaveLength(2);
      activeTimeSlots.forEach(slot => {
        expect(slot.active).toBe(true);
      });
    });

    test('제목으로 검색', async () => {
      const searchResult = await TimeSlot.find({ 
        title: { $regex: '활성 일정', $options: 'i' } 
      });
      
      expect(searchResult).toHaveLength(2);
    });

    test('날짜 범위로 검색', async () => {
      const searchDate = new Date('2024-03-15');
      const timeSlots = await TimeSlot.find({
        baseDate: { $lte: searchDate },
        endDate: { $gte: searchDate }
      });
      
      expect(timeSlots).toHaveLength(1);
      expect(timeSlots[0].title).toBe('활성 일정 1');
    });
  });
}); 