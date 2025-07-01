const TimeSlot = require('../../models/TimeSlot');
require('../setup');

// Mock controllers for basic testing
const mockTimeSlotController = {
  getTimeSlots: async (req, res) => {
    try {
      const timeSlots = await TimeSlot.find();
      res.status(200).json({
        success: true,
        count: timeSlots.length,
        data: timeSlots
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  createTimeSlot: async (req, res) => {
    try {
      const { title, description, baseDate, endDate } = req.body;
      
      if (!title || !baseDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing'
        });
      }
      
      const timeSlot = await TimeSlot.create({
        title,
        description,
        baseDate,
        endDate
      });
      
      res.status(201).json({
        success: true,
        data: timeSlot
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

describe('TimeSlots Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getTimeSlots', () => {
    test('모든 일정 조회 성공', async () => {
      // 테스트용 일정 생성
      await TimeSlot.create([
        {
          title: '2024년 1학기',
          baseDate: new Date('2024-03-01'),
          endDate: new Date('2024-06-30')
        },
        {
          title: '2024년 2학기',
          baseDate: new Date('2024-09-01'),
          endDate: new Date('2024-12-31')
        }
      ]);

      await mockTimeSlotController.getTimeSlots(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: expect.arrayContaining([
          expect.objectContaining({ title: '2024년 1학기' }),
          expect.objectContaining({ title: '2024년 2학기' })
        ])
      });
    });

    test('일정이 없을 때 빈 배열 반환', async () => {
      await mockTimeSlotController.getTimeSlots(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        data: []
      });
    });
  });

  describe('createTimeSlot', () => {
    test('유효한 데이터로 일정 생성 성공', async () => {
      mockReq.body = {
        title: '새 일정',
        description: '테스트 일정입니다',
        baseDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-31')
      };

      await mockTimeSlotController.createTimeSlot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          title: '새 일정',
          description: '테스트 일정입니다'
        })
      });
    });

    test('필수 필드 누락 시 400 오류', async () => {
      mockReq.body = {
        description: '제목 없는 일정'
      };

      await mockTimeSlotController.createTimeSlot(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Required fields missing'
      });
    });
  });
}); 