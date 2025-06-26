/**
 * 504호와 504A호를 하나로 통합하는 스크립트
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

// 504호 좌석 통합 함수
const mergeRooms = async () => {
  try {
    // MongoDB 연결
    const conn = await connectDB();
    const db = conn.connection.db;
    const seatsCollection = db.collection('seats');
    
    // 504A호 좌석 찾기
    const seats504A = await seatsCollection.find({ roomNumber: '504A' }).toArray();
    console.log(`504A호 좌석 ${seats504A.length}개를 찾았습니다.`);
    
    // 업데이트 배열 준비
    const updates = [];
    
    // 504A호 좌석을 504호로 변경
    for (const seat of seats504A) {
      const update = {
        updateOne: {
          filter: { _id: seat._id },
          update: {
            $set: {
              roomNumber: '504',
              section: '504',
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
      console.log(`${result.modifiedCount}개의 좌석을 504호로 통합했습니다.`);
    } else {
      console.log('통합할 504A호 좌석이 없습니다.');
    }
    
    console.log('좌석 통합이 완료되었습니다.');
    
    // 연결 종료
    await mongoose.connection.close();
    
  } catch (error) {
    console.error(`좌석 통합 오류: ${error.message}`);
    process.exit(1);
  }
};

// 스크립트 실행
mergeRooms(); 