const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// MongoDB 연결 설정
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';
console.log('MongoDB 연결 문자열:', mongoUri);

// 좌석 데이터 - 이미지에 보이는 배치도 기반
const seatsData = [
  // 504호 (석사 연구실) - 1행
  { seatId: '504-1', roomNumber: '504', type: '석사', row: 0, col: 0, seatNumber: 1 },
  { seatId: '504-2', roomNumber: '504', type: '석사', row: 0, col: 1, seatNumber: 2 },
  { seatId: '504-3', roomNumber: '504', type: '석사', row: 0, col: 2, seatNumber: 3 },
  // 504호 (석사 연구실) - 2행
  { seatId: '504-4', roomNumber: '504', type: '석사', row: 1, col: 0, seatNumber: 4 },
  { seatId: '504-5', roomNumber: '504', type: '석사', row: 1, col: 1, seatNumber: 5 },
  { seatId: '504-6', roomNumber: '504', type: '석사', row: 1, col: 2, seatNumber: 6 },
  // 504호 (석사 연구실) - 3행
  { seatId: '504-7', roomNumber: '504', type: '석사', row: 2, col: 0, seatNumber: 7 },
  { seatId: '504-8', roomNumber: '504', type: '석사', row: 2, col: 1, seatNumber: 8 },
  { seatId: '504-9', roomNumber: '504', type: '석사', row: 2, col: 2, seatNumber: 9 },
  // 504호 (석사 연구실) - 4행
  { seatId: '504-10', roomNumber: '504', type: '석사', row: 3, col: 0, seatNumber: 10 },
  { seatId: '504-11', roomNumber: '504', type: '석사', row: 3, col: 1, seatNumber: 11 },
  { seatId: '504-12', roomNumber: '504', type: '석사', row: 3, col: 2, seatNumber: 12 },
  // 504호 (석사 연구실) - 5행
  { seatId: '504-13', roomNumber: '504', type: '석사', row: 4, col: 0, seatNumber: 13 },
  { seatId: '504-14', roomNumber: '504', type: '석사', row: 4, col: 1, seatNumber: 14 },
  { seatId: '504-15', roomNumber: '504', type: '석사', row: 4, col: 2, seatNumber: 15 },
  // 504호 (석사 연구실) - 6행
  { seatId: '504-97', roomNumber: '504', type: '석사', row: 5, col: 0, seatNumber: 97 },
  { seatId: '504-98', roomNumber: '504', type: '석사', row: 5, col: 1, seatNumber: 98 },
  { seatId: '504-99', roomNumber: '504', type: '석사', row: 5, col: 2, seatNumber: 99 },
  
  // 506호 (석사 연구실) - 상단
  { seatId: '506-16', roomNumber: '506', type: '석사', row: 0, col: 0, seatNumber: 16 },
  { seatId: '506-17', roomNumber: '506', type: '석사', row: 1, col: 0, seatNumber: 17 },
  { seatId: '506-18', roomNumber: '506', type: '석사', row: 2, col: 0, seatNumber: 18 },
  { seatId: '506-19', roomNumber: '506', type: '석사', row: 3, col: 0, seatNumber: 19 },
  { seatId: '506-20', roomNumber: '506', type: '석사', row: 4, col: 0, seatNumber: 20 },
  { seatId: '506-21', roomNumber: '506', type: '석사', row: 5, col: 0, seatNumber: 21 },
  { seatId: '506-22', roomNumber: '506', type: '석사', row: 6, col: 0, seatNumber: 22 },
  
  // 506호 (석사 연구실) - 우측
  { seatId: '506-23', roomNumber: '506', type: '석사', row: 0, col: 2, seatNumber: 23 },
  { seatId: '506-24', roomNumber: '506', type: '석사', row: 1, col: 2, seatNumber: 24 },
  { seatId: '506-25', roomNumber: '506', type: '석사', row: 2, col: 2, seatNumber: 25 },
  { seatId: '506-26', roomNumber: '506', type: '석사', row: 3, col: 2, seatNumber: 26 },
  { seatId: '506-27', roomNumber: '506', type: '석사', row: 4, col: 2, seatNumber: 27 },
  { seatId: '506-28', roomNumber: '506', type: '석사', row: 5, col: 2, seatNumber: 28 },
  
  // 508호 (석사 연구실) - 첫째 줄
  { seatId: '508-29', roomNumber: '508', type: '석사', row: 0, col: 0, seatNumber: 29 },
  { seatId: '508-36', roomNumber: '508', type: '석사', row: 0, col: 2, seatNumber: 36 },
  
  // 508호 (석사 연구실) - 둘째 줄
  { seatId: '508-30', roomNumber: '508', type: '석사', row: 1, col: 0, seatNumber: 30 },
  { seatId: '508-37', roomNumber: '508', type: '석사', row: 1, col: 2, seatNumber: 37 },
  
  // 508호 (석사 연구실) - 셋째 줄
  { seatId: '508-31', roomNumber: '508', type: '석사', row: 2, col: 0, seatNumber: 31 },
  { seatId: '508-38', roomNumber: '508', type: '석사', row: 2, col: 2, seatNumber: 38 },
  
  // 508호 (석사 연구실) - 넷째 줄
  { seatId: '508-32', roomNumber: '508', type: '석사', row: 3, col: 0, seatNumber: 32 },
  { seatId: '508-39', roomNumber: '508', type: '석사', row: 3, col: 2, seatNumber: 39 },
  
  // 508호 (석사 연구실) - 다섯째 줄
  { seatId: '508-33', roomNumber: '508', type: '석사', row: 4, col: 0, seatNumber: 33 },
  { seatId: '508-40', roomNumber: '508', type: '석사', row: 4, col: 2, seatNumber: 40 },
  
  // 508호 (석사 연구실) - 여섯째 줄
  { seatId: '508-34', roomNumber: '508', type: '석사', row: 5, col: 0, seatNumber: 34 },
  { seatId: '508-41', roomNumber: '508', type: '석사', row: 5, col: 2, seatNumber: 41 },
  
  // 508호 (석사 연구실) - 일곱째 줄
  { seatId: '508-35', roomNumber: '508', type: '석사', row: 6, col: 0, seatNumber: 35 },
  { seatId: '508-42', roomNumber: '508', type: '석사', row: 6, col: 2, seatNumber: 42 },
  
  // 510호 (석사 연구실) - 왼쪽 컬럼
  { seatId: '510-43', roomNumber: '510', type: '석사', row: 0, col: 0, seatNumber: 43 },
  { seatId: '510-44', roomNumber: '510', type: '석사', row: 1, col: 0, seatNumber: 44 },
  { seatId: '510-45', roomNumber: '510', type: '석사', row: 2, col: 0, seatNumber: 45 },
  { seatId: '510-46', roomNumber: '510', type: '석사', row: 3, col: 0, seatNumber: 46 },
  { seatId: '510-47', roomNumber: '510', type: '석사', row: 4, col: 0, seatNumber: 47 },
  { seatId: '510-48', roomNumber: '510', type: '석사', row: 5, col: 0, seatNumber: 48 },
  { seatId: '510-49', roomNumber: '510', type: '석사', row: 6, col: 0, seatNumber: 49 },
  
  // 510호 (석사 연구실) - 오른쪽 컬럼
  { seatId: '510-50', roomNumber: '510', type: '석사', row: 0, col: 2, seatNumber: 50 },
  { seatId: '510-51', roomNumber: '510', type: '석사', row: 1, col: 2, seatNumber: 51 },
  { seatId: '510-52', roomNumber: '510', type: '석사', row: 2, col: 2, seatNumber: 52 },
  { seatId: '510-53', roomNumber: '510', type: '석사', row: 3, col: 2, seatNumber: 53 },
  { seatId: '510-54', roomNumber: '510', type: '석사', row: 4, col: 2, seatNumber: 54 },
  { seatId: '510-55', roomNumber: '510', type: '석사', row: 5, col: 2, seatNumber: 55 },
  { seatId: '510-56', roomNumber: '510', type: '석사', row: 6, col: 2, seatNumber: 56 },
  
  // 501호 (박사 연구실)
  { seatId: '501-7', roomNumber: '501', type: '박사', row: 0, col: 0, seatNumber: 7 },
  { seatId: '501-8', roomNumber: '501', type: '박사', row: 1, col: 0, seatNumber: 8 },
  { seatId: '501-9', roomNumber: '501', type: '박사', row: 2, col: 0, seatNumber: 9 },
  { seatId: '501-10', roomNumber: '501', type: '박사', row: 2, col: 2, seatNumber: 10 },

  // 504 추가 좌석 (박사 연구실로 표시된)
  { seatId: '504A-54', roomNumber: '504', type: '박사', row: 0, col: 0, seatNumber: 54 },
  { seatId: '504A-57', roomNumber: '504', type: '박사', row: 0, col: 1, seatNumber: 57 },
  { seatId: '504A-58', roomNumber: '504', type: '박사', row: 0, col: 2, seatNumber: 58 },
  { seatId: '504A-59', roomNumber: '504', type: '박사', row: 0, col: 3, seatNumber: 59 },
  
  // 503호 (박사 연구실)
  { seatId: '503-11', roomNumber: '503', type: '박사', row: 0, col: 0, seatNumber: 11 },
  { seatId: '503-12', roomNumber: '503', type: '박사', row: 1, col: 0, seatNumber: 12 },
  { seatId: '503-13', roomNumber: '503', type: '박사', row: 2, col: 0, seatNumber: 13 },
  { seatId: '503-14', roomNumber: '503', type: '박사', row: 0, col: 2, seatNumber: 14 },
  { seatId: '503-15', roomNumber: '503', type: '박사', row: 1, col: 2, seatNumber: 15 },
  { seatId: '503-16', roomNumber: '503', type: '박사', row: 2, col: 2, seatNumber: 16 },
  
  // 505호 (박사 연구실)
  { seatId: '505-17', roomNumber: '505', type: '박사', row: 0, col: 0, seatNumber: 17 },
  { seatId: '505-18', roomNumber: '505', type: '박사', row: 1, col: 0, seatNumber: 18 },
  { seatId: '505-19', roomNumber: '505', type: '박사', row: 2, col: 0, seatNumber: 19 },
  { seatId: '505-20', roomNumber: '505', type: '박사', row: 0, col: 2, seatNumber: 20 },
  { seatId: '505-21', roomNumber: '505', type: '박사', row: 1, col: 2, seatNumber: 21 },
  { seatId: '505-22', roomNumber: '505', type: '박사', row: 2, col: 2, seatNumber: 22 },
  
  // 507호 (박사 연구실)
  { seatId: '507-23', roomNumber: '507', type: '박사', row: 0, col: 0, seatNumber: 23 },
  { seatId: '507-24', roomNumber: '507', type: '박사', row: 1, col: 0, seatNumber: 24 },
  { seatId: '507-25', roomNumber: '507', type: '박사', row: 2, col: 0, seatNumber: 25 },
  { seatId: '507-26', roomNumber: '507', type: '박사', row: 0, col: 2, seatNumber: 26 },
  { seatId: '507-27', roomNumber: '507', type: '박사', row: 1, col: 2, seatNumber: 27 },
  { seatId: '507-28', roomNumber: '507', type: '박사', row: 2, col: 2, seatNumber: 28 }
];

// 일정 데이터
const timeSlotData = [
  {
    priority: 1, // 1순위 (박사과정)
    openTime: new Date('2023-09-01T09:00:00Z'),
    closeTime: new Date('2023-09-10T18:00:00Z'),
    semester: '2023-2학기'
  },
  {
    priority: 2, // 2순위 (석사과정 고학년)
    openTime: new Date('2023-09-11T09:00:00Z'),
    closeTime: new Date('2023-09-20T18:00:00Z'),
    semester: '2023-2학기'
  },
  {
    priority: 3, // 3순위 (석사과정 신입생)
    openTime: new Date('2023-09-21T09:00:00Z'),
    closeTime: new Date('2023-09-30T18:00:00Z'),
    semester: '2023-2학기'
  }
];

// 데이터베이스에 연결하고 데이터 초기화하는 함수
async function seedDatabase() {
  try {
    // MongoDB 연결
    await mongoose.connect(mongoUri);
    console.log('MongoDB에 연결되었습니다.');

    // 모델 불러오기
    const Seat = require('../models/Seat');
    const TimeSlot = require('../models/TimeSlot');

    // 컬렉션 초기화 (기존 데이터 삭제)
    console.log('기존 좌석 데이터 삭제 중...');
    await Seat.deleteMany({});
    console.log('기존 일정 데이터 삭제 중...');
    await TimeSlot.deleteMany({});

    // 새 데이터 삽입
    console.log('새 좌석 데이터 삽입 중...');
    await Seat.insertMany(seatsData);
    console.log(`${seatsData.length}개의 좌석 데이터가 삽입되었습니다.`);

    console.log('새 일정 데이터 삽입 중...');
    await TimeSlot.insertMany(timeSlotData);
    console.log(`${timeSlotData.length}개의 일정 데이터가 삽입되었습니다.`);

    console.log('데이터 초기화가 완료되었습니다.');
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
  } finally {
    // 연결 종료
    await mongoose.connection.close();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
seedDatabase(); 