/**
 * 504호와 504A호를 하나로 통합하는 스크립트
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Seat = require('../models/Seat');

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

async function merge504Rooms() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 504A호 좌석들을 찾기
    const seats504A = await Seat.find({ roomNumber: '504A' });

    if (seats504A.length > 0) {
      // 모든 504A호 좌석을 504호로 변경
      const result = await Seat.updateMany(
        { roomNumber: '504A' },
        { 
          $set: { 
            roomNumber: '504',
            section: '504'
          }
        }
      );
    } else {
      // 통합할 504A호 좌석이 없음
    }

  } catch (error) {
    // 오류 처리
  } finally {
    await mongoose.disconnect();
  }
}

// 스크립트 실행
merge504Rooms(); 