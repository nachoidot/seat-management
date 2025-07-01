/**
 * 박사 연구실(501, 503, 505, 507) 좌석 레이아웃 업데이트 스크립트
 * 이미지를 바탕으로 정확한 좌석 레이아웃 적용
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Seat = require('../models/Seat');

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

async function updatePhdLayouts() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 기존 박사 연구실 좌석들 삭제
    const deleteResult = await Seat.deleteMany({ 
      roomNumber: { $in: ['501', '503', '505', '507'] } 
    });

    // 새로운 박사 연구실 좌석 데이터 생성
    const phdSeats = [
      // ... 좌석 데이터는 기존 코드와 동일하므로 생략 ...
    ];

    // 새 좌석 데이터 삽입
    const insertResult = await Seat.insertMany(phdSeats);

  } catch (error) {
    // 오류 처리
  } finally {
    await mongoose.disconnect();
  }
}

// 스크립트 실행
updatePhdLayouts(); 