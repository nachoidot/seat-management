/**
 * 좌석 데이터 마이그레이션 스크립트
 * 기존 seatId 형식에서 number, section 형식으로 변환
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

// 좌석 데이터 마이그레이션 함수
const migrateSeats = async () => {
  try {
    // MongoDB 연결
    const conn = await connectDB();
    const db = conn.connection.db;
    const seatsCollection = db.collection('seats');
    
    // 모든 좌석 데이터 가져오기
    const seats = await seatsCollection.find({}).toArray();
    console.log(`총 ${seats.length}개의 좌석 데이터를 찾았습니다.`);
    
    // 좌석 업데이트 배열 준비
    const updates = [];
    
    for (const seat of seats) {
      // 예: "504-1"에서 방 번호와 좌석 번호 추출
      let roomNumber, number;
      
      if (seat.seatId) {
        const parts = seat.seatId.split('-');
        roomNumber = parts[0];
        number = parts[1];
      } else {
        // 이미 새 형식으로 변환된 경우 또는 필드가 없는 경우
        roomNumber = seat.roomNumber || '';
        number = seat.number || '';
      }
      
      // 좌석 유형 확인 (석사/박사)
      // 방 번호에 따라 유형 결정 (504, 506, 508, 510: 석사, 501, 503, 505, 507: 박사)
      const type = ['504', '506', '508', '510'].includes(roomNumber) ? '석사' : '박사';
      
      // section 필드 설정 (예: "504" 또는 다른 구분자)
      const section = roomNumber;
      
      // 업데이트 객체 생성
      const update = {
        updateOne: {
          filter: { _id: seat._id },
          update: {
            $set: {
              number,
              section,
              roomNumber,
              type,
              // 기존 필드는 유지
              row: seat.row || 0,
              col: seat.col || 0,
              status: seat.status || 'available',
              assignedTo: seat.assignedTo || null,
              confirmed: seat.confirmed || false,
              active: true,
              updatedAt: new Date()
            }
          }
        }
      };
      
      updates.push(update);
    }
    
    // 데이터가 있는 경우에만 일괄 업데이트 수행
    if (updates.length > 0) {
      const result = await seatsCollection.bulkWrite(updates);
      console.log(`${result.modifiedCount}개의 좌석 데이터를 성공적으로 업데이트했습니다.`);
    } else {
      console.log('업데이트할 좌석 데이터가 없습니다.');
    }
    
    console.log('좌석 데이터 마이그레이션이 완료되었습니다.');
    
    // 연결 종료
    await mongoose.connection.close();
    
  } catch (error) {
    console.error(`마이그레이션 오류: ${error.message}`);
    process.exit(1);
  }
};

// 스크립트 실행
migrateSeats(); 