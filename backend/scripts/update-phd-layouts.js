/**
 * 박사 연구실(501, 503, 505, 507) 좌석 레이아웃 업데이트 스크립트
 * 이미지를 바탕으로 정확한 좌석 레이아웃 적용
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

// 박사 연구실 좌석 레이아웃 업데이트 함수
const updateLayouts = async () => {
  try {
    // MongoDB 연결
    const conn = await connectDB();
    const db = conn.connection.db;
    const seatsCollection = db.collection('seats');
    
    // 기존 박사 연구실 좌석 삭제
    const deleteResult = await seatsCollection.deleteMany({ 
      roomNumber: { $in: ['501', '503', '505', '507'] } 
    });
    console.log(`기존 박사 연구실 좌석 ${deleteResult.deletedCount}개를 삭제했습니다.`);
    
    // 각 방별 좌석 및 오브젝트 데이터 생성
    const allItems = [
      // 501호 레이아웃
      ...createRoom501Items(),
      // 503호 레이아웃
      ...createRoom503Items(),
      // 505호 레이아웃
      ...createRoom505Items(),
      // 507호 레이아웃
      ...createRoom507Items()
    ];
    
    // 데이터 삽입
    if (allItems.length > 0) {
      const insertResult = await seatsCollection.insertMany(allItems);
      console.log(`${insertResult.insertedCount}개의 박사 연구실 아이템을 생성했습니다.`);
    }
    
    console.log('박사 연구실 좌석 레이아웃 업데이트가 완료되었습니다.');
    
    // 연결 종료
    await mongoose.connection.close();
    
  } catch (error) {
    console.error(`좌석 레이아웃 업데이트 오류: ${error.message}`);
    process.exit(1);
  }
};

// 501호 아이템 생성
function createRoom501Items() {
  const roomNumber = '501';
  
  // 좌석 데이터 (이미지 기준)
  const seatData = [
    { number: '6', row: 2, col: 1 },
    { number: '7', row: 0, col: 1 },
    { number: '8', row: 1, col: 1 },
    { number: '9', row: 0, col: 3 },
    { number: '10', row: 1, col: 3 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 출입구
    { objectType: 'door', objectName: '출입구', row: 2, col: 2 }
  ];
  
  // 좌석 및 오브젝트 데이터 변환
  const items = [
    ...seatData.map(seat => createSeatItem(roomNumber, seat)),
    ...objectData.map((obj, index) => createObjectItem(roomNumber, obj, index))
  ];
  
  return items;
}

// 503호 아이템 생성
function createRoom503Items() {
  const roomNumber = '503';
  
  // 좌석 데이터 (이미지 기준)
  const seatData = [
    { number: '11', row: 0, col: 1 },
    { number: '12', row: 1, col: 1 },
    { number: '13', row: 2, col: 1 },
    { number: '14', row: 0, col: 3 },
    { number: '15', row: 1, col: 3 },
    { number: '16', row: 2, col: 3 },
    { number: '29', row: 3, col: 1 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 출입구
    { objectType: 'door', objectName: '출입구', row: 4, col: 2 }
  ];
  
  // 좌석 및 오브젝트 데이터 변환
  const items = [
    ...seatData.map(seat => createSeatItem(roomNumber, seat)),
    ...objectData.map((obj, index) => createObjectItem(roomNumber, obj, index))
  ];
  
  return items;
}

// 505호 아이템 생성
function createRoom505Items() {
  const roomNumber = '505';
  
  // 좌석 데이터 (이미지 기준)
  const seatData = [
    { number: '17', row: 0, col: 1 },
    { number: '18', row: 1, col: 1 },
    { number: '19', row: 2, col: 1 },
    { number: '20', row: 0, col: 3 },
    { number: '21', row: 1, col: 3 },
    { number: '22', row: 2, col: 3 },
    { number: '30', row: 3, col: 1 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 출입구
    { objectType: 'door', objectName: '출입구', row: 4, col: 2 }
  ];
  
  // 좌석 및 오브젝트 데이터 변환
  const items = [
    ...seatData.map(seat => createSeatItem(roomNumber, seat)),
    ...objectData.map((obj, index) => createObjectItem(roomNumber, obj, index))
  ];
  
  return items;
}

// 507호 아이템 생성
function createRoom507Items() {
  const roomNumber = '507';
  
  // 좌석 데이터 (이미지 기준)
  const seatData = [
    { number: '23', row: 0, col: 1 },
    { number: '24', row: 1, col: 1 },
    { number: '25', row: 2, col: 1 },
    { number: '26', row: 0, col: 3 },
    { number: '27', row: 1, col: 3 },
    { number: '28', row: 2, col: 3 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 출입구
    { objectType: 'door', objectName: '출입구', row: 4, col: 2 }
  ];
  
  // 좌석 및 오브젝트 데이터 변환
  const items = [
    ...seatData.map(seat => createSeatItem(roomNumber, seat)),
    ...objectData.map((obj, index) => createObjectItem(roomNumber, obj, index))
  ];
  
  return items;
}

// 좌석 아이템 생성 헬퍼 함수
function createSeatItem(roomNumber, seat) {
  return {
    number: seat.number,
    section: roomNumber,
    roomNumber: roomNumber,
    seatId: `${roomNumber}-${seat.number}`,
    type: '박사',
    row: seat.row,
    col: seat.col,
    status: 'available',
    assignedTo: null,
    confirmed: false,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// 오브젝트 아이템 생성 헬퍼 함수
function createObjectItem(roomNumber, obj, index) {
  return {
    number: `obj-${roomNumber}-${index}`,
    section: roomNumber,
    roomNumber: roomNumber,
    seatId: `${roomNumber}-obj-${index}`,
    objectType: obj.objectType,
    objectName: obj.objectName,
    row: obj.row,
    col: obj.col,
    status: 'disabled',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// 스크립트 실행
updateLayouts(); 