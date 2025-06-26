/**
 * 모든 석사 연구실(504, 506, 508, 510) 좌석 레이아웃 업데이트 스크립트
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

// 석사 연구실 좌석 레이아웃 업데이트 함수
const updateLayouts = async () => {
  try {
    // MongoDB 연결
    const conn = await connectDB();
    const db = conn.connection.db;
    const seatsCollection = db.collection('seats');
    
    // 기존 석사 연구실 좌석 삭제
    const deleteResult = await seatsCollection.deleteMany({ 
      roomNumber: { $in: ['504', '506', '508', '510'] } 
    });
    console.log(`기존 석사 연구실 좌석 ${deleteResult.deletedCount}개를 삭제했습니다.`);
    
    // 각 방별 좌석 및 오브젝트 데이터 생성
    const allItems = [
      // 504호 레이아웃
      ...createRoom504Items(),
      // 506호 레이아웃
      ...createRoom506Items(),
      // 508호 레이아웃
      ...createRoom508Items(),
      // 510호 레이아웃
      ...createRoom510Items()
    ];
    
    // 데이터 삽입
    if (allItems.length > 0) {
      const insertResult = await seatsCollection.insertMany(allItems);
      console.log(`${insertResult.insertedCount}개의 석사 연구실 아이템을 생성했습니다.`);
    }
    
    console.log('석사 연구실 좌석 레이아웃 업데이트가 완료되었습니다.');
    
    // 연결 종료
    await mongoose.connection.close();
    
  } catch (error) {
    console.error(`좌석 레이아웃 업데이트 오류: ${error.message}`);
    process.exit(1);
  }
};

// 504호 아이템 생성
function createRoom504Items() {
  const roomNumber = '504';
  
  // 좌석 데이터
  const seatData = [
    { number: '1', row: 0, col: 1 },
    { number: '2', row: 0, col: 2 },
    { number: '3', row: 0, col: 3 },
    { number: '4', row: 1, col: 1 },
    { number: '5', row: 1, col: 2 },
    { number: '6', row: 1, col: 3 },
    { number: '7', row: 2, col: 1 },
    { number: '8', row: 2, col: 2 },
    { number: '9', row: 2, col: 3 },
    { number: '10', row: 3, col: 1 },
    { number: '11', row: 3, col: 2 },
    { number: '12', row: 3, col: 3 },
    { number: '13', row: 4, col: 1 },
    { number: '14', row: 4, col: 2 },
    { number: '15', row: 4, col: 3 },
    { number: '57', row: 5, col: 1 },
    { number: '58', row: 5, col: 2 },
    { number: '59', row: 5, col: 3 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 창문 (2번 좌석 바로 위)
    { objectType: 'window', objectName: '창문', row: 0, col: 0 },
    
    // 출입구 (57번 좌측)
    { objectType: 'door', objectName: '출입구', row: 5, col: 0 }
  ];
  
  // 좌석 및 오브젝트 데이터 변환
  const items = [
    ...seatData.map(seat => createSeatItem(roomNumber, seat)),
    ...objectData.map((obj, index) => createObjectItem(roomNumber, obj, index))
  ];
  
  return items;
}

// 506호 아이템 생성
function createRoom506Items() {
  const roomNumber = '506';
  
  // 좌석 데이터 (이미지 기준)
  const seatData = [
    { number: '16', row: 0, col: 0 },
    { number: '17', row: 1, col: 0 },
    { number: '18', row: 2, col: 0 },
    { number: '19', row: 3, col: 0 },
    { number: '20', row: 4, col: 0 },
    { number: '21', row: 5, col: 0 },
    { number: '22', row: 6, col: 0 },
    { number: '23', row: 1, col: 2 },
    { number: '24', row: 2, col: 2 },
    { number: '25', row: 3, col: 2 },
    { number: '26', row: 4, col: 2 },
    { number: '27', row: 5, col: 2 },
    { number: '28', row: 6, col: 2 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 창문 (16번 오른쪽)
    { objectType: 'window', objectName: '창문', row: 0, col: 1 },
    
    // 기둥
    { objectType: 'pillar', objectName: '기둥', row: 0, col: 2 },
    
    // 에어컨 (19번 오른쪽)
    { objectType: 'ac', objectName: '에어컨', row: 3, col: 1 }
  ];
  
  // 좌석 및 오브젝트 데이터 변환
  const items = [
    ...seatData.map(seat => createSeatItem(roomNumber, seat)),
    ...objectData.map((obj, index) => createObjectItem(roomNumber, obj, index))
  ];
  
  return items;
}

// 508호 아이템 생성
function createRoom508Items() {
  const roomNumber = '508';
  
  // 좌석 데이터 (이미지 기준)
  const seatData = [
    { number: '29', row: 0, col: 0 },
    { number: '30', row: 1, col: 0 },
    { number: '31', row: 2, col: 0 },
    { number: '32', row: 3, col: 0 },
    { number: '33', row: 4, col: 0 },
    { number: '34', row: 5, col: 0 },
    { number: '35', row: 6, col: 0 },
    { number: '36', row: 0, col: 2 },
    { number: '37', row: 1, col: 2 },
    { number: '38', row: 2, col: 2 },
    { number: '39', row: 3, col: 2 },
    { number: '40', row: 4, col: 2 },
    { number: '41', row: 5, col: 2 },
    { number: '42', row: 6, col: 2 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 창문 (29번 오른쪽)
    { objectType: 'window', objectName: '창문', row: 0, col: 1 },
    
    // 에어컨 (32번 오른쪽)
    { objectType: 'ac', objectName: '에어컨', row: 3, col: 1 },
    
    // 출입구 (35번 아래)
    { objectType: 'door', objectName: '출입구', row: 7, col: 0 }
  ];
  
  // 좌석 및 오브젝트 데이터 변환
  const items = [
    ...seatData.map(seat => createSeatItem(roomNumber, seat)),
    ...objectData.map((obj, index) => createObjectItem(roomNumber, obj, index))
  ];
  
  return items;
}

// 510호 아이템 생성
function createRoom510Items() {
  const roomNumber = '510';
  
  // 좌석 데이터 (이미지 기준)
  const seatData = [
    { number: '43', row: 0, col: 0 },
    { number: '44', row: 1, col: 0 },
    { number: '45', row: 2, col: 0 },
    { number: '46', row: 3, col: 0 },
    { number: '47', row: 4, col: 0 },
    { number: '48', row: 5, col: 0 },
    { number: '49', row: 6, col: 0 },
    { number: '50', row: 0, col: 2 },
    { number: '51', row: 1, col: 2 },
    { number: '52', row: 2, col: 2 },
    { number: '53', row: 3, col: 2 },
    { number: '54', row: 4, col: 2 },
    { number: '55', row: 5, col: 2 },
    { number: '56', row: 6, col: 2 }
  ];
  
  // 오브젝트 데이터
  const objectData = [
    // 창문 (43번과 50번 사이)
    { objectType: 'window', objectName: '창문', row: 0, col: 1 },
    
    // 에어컨 (46번과 53번 사이)
    { objectType: 'ac', objectName: '에어컨', row: 3, col: 1 }
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
    type: '석사',
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