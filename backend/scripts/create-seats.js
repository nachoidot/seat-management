/**
 * 좌석 데이터 초기화 스크립트
 * 제공된 좌석 배치도에 따라 좌석 데이터 생성
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 환경 변수 로드
dotenv.config({ path: './.env' });

// MongoDB 연결
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB 연결 성공: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB 연결 오류: ${error.message}`);
    process.exit(1);
  }
};

// 좌석 데이터 생성 함수
const createSeats = async () => {
  try {
    // MongoDB 연결
    const conn = await connectDB();
    const db = conn.connection.db;
    const seatsCollection = db.collection('seats');
    
    // 기존 좌석 데이터 삭제 여부 확인 (필요시 주석 해제)
    // await seatsCollection.deleteMany({});
    // console.log('기존 좌석 데이터를 모두 삭제했습니다.');
    
    // 석사실 (504, 506, 508, 510)
    const masterRooms = [
      { roomNumber: '504', seats: 15 },  // 1~15
      { roomNumber: '506', seats: 14 },  // 16~29
      { roomNumber: '508', seats: 14 },  // 30~43
      { roomNumber: '510', seats: 14 },  // 44~57
    ];
    
    // 박사실 (501, 503, 505, 507)
    const phdRooms = [
      { roomNumber: '501', seats: 4 },   // 7~10
      { roomNumber: '503', seats: 6 },   // 11~16
      { roomNumber: '505', seats: 6 },   // 17~22
      { roomNumber: '507', seats: 6 },   // 23~28
    ];
    
    // 좌석 데이터 생성
    const seats = [];
    
    // 석사실 좌석 생성
    for (const room of masterRooms) {
      for (let i = 1; i <= room.seats; i++) {
        seats.push({
          number: i.toString(),
          section: room.roomNumber,
          roomNumber: room.roomNumber,
          type: '석사',
          row: Math.floor((i - 1) / 3),
          col: (i - 1) % 3,
          status: 'available',
          assignedTo: null,
          confirmed: false,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // 박사실 좌석 생성
    for (const room of phdRooms) {
      // 박사실은 이미지에 표시된 번호 범위를 그대로 사용
      let startNumber;
      if (room.roomNumber === '501') startNumber = 7;
      else if (room.roomNumber === '503') startNumber = 11;
      else if (room.roomNumber === '505') startNumber = 17;
      else if (room.roomNumber === '507') startNumber = 23;
      
      for (let i = 0; i < room.seats; i++) {
        const seatNumber = (startNumber + i).toString();
        seats.push({
          number: seatNumber,
          section: room.roomNumber,
          roomNumber: room.roomNumber,
          type: '박사',
          row: Math.floor(i / 2),
          col: i % 2,
          status: 'available',
          assignedTo: null,
          confirmed: false,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // 좌석 데이터 저장
    if (seats.length > 0) {
      const result = await seatsCollection.insertMany(seats);
      console.log(`${result.insertedCount}개의 좌석 데이터를 성공적으로 생성했습니다.`);
    } else {
      console.log('생성할 좌석 데이터가 없습니다.');
    }
    
    console.log('좌석 데이터 생성이 완료되었습니다.');
    
    // 연결 종료
    await mongoose.connection.close();
    
  } catch (error) {
    console.error(`좌석 생성 오류: ${error.message}`);
    process.exit(1);
  }
};

// 스크립트 실행
createSeats(); 