const Seat = require('../../models/Seat');
require('../setup');

describe('Seat Model', () => {
  
  describe('Seat Schema Validation', () => {
    test('올바른 좌석 데이터로 좌석 생성 성공', async () => {
      const seatData = {
        number: 'A01',
        section: 'A',
        roomNumber: '501',
        type: '석사',
        row: 1,
        col: 1,
        status: 'available'
      };

      const seat = new Seat(seatData);
      const savedSeat = await seat.save();

      expect(savedSeat.number).toBe(seatData.number);
      expect(savedSeat.section).toBe(seatData.section);
      expect(savedSeat.roomNumber).toBe(seatData.roomNumber);
      expect(savedSeat.type).toBe(seatData.type);
      expect(savedSeat.row).toBe(seatData.row);
      expect(savedSeat.col).toBe(seatData.col);
      expect(savedSeat.status).toBe(seatData.status);
      expect(savedSeat.createdAt).toBeDefined();
    });

    test('필수 필드 누락 시 검증 오류', async () => {
      const seat = new Seat({});
      
      await expect(seat.save()).rejects.toThrow();
    });

    test('잘못된 roomNumber 값으로 좌석 생성 시 오류', async () => {
      const invalidSeat = new Seat({
        number: 'A01',
        section: 'A',
        roomNumber: '999', // 허용되지 않는 값
        type: '석사',
        row: 1,
        col: 1
      });

      await expect(invalidSeat.save()).rejects.toThrow();
    });

    test('잘못된 type 값으로 좌석 생성 시 오류', async () => {
      const invalidSeat = new Seat({
        number: 'A01',
        section: 'A',
        roomNumber: '501',
        type: '학부생', // 허용되지 않는 값
        row: 1,
        col: 1
      });

      await expect(invalidSeat.save()).rejects.toThrow();
    });

    test('잘못된 status 값으로 좌석 생성 시 오류', async () => {
      const invalidSeat = new Seat({
        number: 'A01',
        section: 'A',
        roomNumber: '501',
        type: '석사',
        row: 1,
        col: 1,
        status: 'invalid-status' // 허용되지 않는 값
      });

      await expect(invalidSeat.save()).rejects.toThrow();
    });
  });

  describe('Unique Constraints', () => {
    test('동일한 number와 section으로 좌석 생성 시 오류', async () => {
      const seatData = {
        number: 'A01',
        section: 'A',
        roomNumber: '501',
        type: '석사',
        row: 1,
        col: 1
      };

      await Seat.create(seatData);

      const duplicateSeat = new Seat({
        ...seatData,
        roomNumber: '502' // 다른 룸이어도 number와 section이 같으면 오류
      });

      await expect(duplicateSeat.save()).rejects.toThrow();
    });

    test('동일한 assignedTo 값으로 좌석 할당 시 오류', async () => {
      const userId = 'test123';

      await Seat.create({
        number: 'A01',
        section: 'A',
        roomNumber: '501',
        type: '석사',
        row: 1,
        col: 1,
        assignedTo: userId
      });

      const secondSeat = new Seat({
        number: 'A02',
        section: 'A',
        roomNumber: '501',
        type: '석사',
        row: 1,
        col: 2,
        assignedTo: userId // 같은 사용자에게 다시 할당
      });

      await expect(secondSeat.save()).rejects.toThrow();
    });

    test('assignedTo가 null인 좌석들은 중복 허용', async () => {
      await Seat.create({
        number: 'A01',
        section: 'A',
        roomNumber: '501',
        type: '석사',
        row: 1,
        col: 1,
        assignedTo: null
      });

      const secondSeat = new Seat({
        number: 'A02',
        section: 'A',
        roomNumber: '501',
        type: '석사',
        row: 1,
        col: 2,
        assignedTo: null
      });

      await expect(secondSeat.save()).resolves.toBeDefined();
    });
  });

  describe('Default Values', () => {
    test('기본값 설정 확인', async () => {
      const seat = new Seat({
        number: 'B01',
        section: 'B',
        roomNumber: '502',
        row: 1,
        col: 1
      });

      await seat.save();

      expect(seat.type).toBe('석사'); // 기본값
      expect(seat.active).toBe(true); // 기본값
      expect(seat.status).toBe('available'); // 기본값
      expect(seat.assignedTo).toBe(null); // 기본값
      expect(seat.confirmed).toBe(false); // 기본값
      expect(seat.createdAt).toBeDefined();
      expect(seat.updatedAt).toBeDefined();
    });
  });

  describe('Seat Assignment', () => {
    test('좌석에 사용자 할당', async () => {
      const seat = new Seat({
        number: 'C01',
        section: 'C',
        roomNumber: '503',
        row: 1,
        col: 1
      });

      await seat.save();

      seat.assignedTo = 'user123';
      seat.status = 'occupied';
      await seat.save();

      expect(seat.assignedTo).toBe('user123');
      expect(seat.status).toBe('occupied');
    });

    test('좌석 할당 해제', async () => {
      const seat = new Seat({
        number: 'D01',
        section: 'D',
        roomNumber: '504',
        row: 1,
        col: 1,
        assignedTo: 'user456',
        status: 'occupied'
      });

      await seat.save();

      seat.assignedTo = null;
      seat.status = 'available';
      await seat.save();

      expect(seat.assignedTo).toBe(null);
      expect(seat.status).toBe('available');
    });
  });

  describe('Seat Status Management', () => {
    test('유효한 상태 변경', async () => {
      const seat = await Seat.create({
        number: 'E01',
        section: 'E',
        roomNumber: '505',
        row: 1,
        col: 1
      });

      const validStatuses = ['available', 'occupied', 'reserved', 'maintenance'];

      for (const status of validStatuses) {
        seat.status = status;
        await expect(seat.save()).resolves.toBeDefined();
        expect(seat.status).toBe(status);
      }
    });
  });
}); 