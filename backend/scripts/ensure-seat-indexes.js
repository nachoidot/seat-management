const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Seat = require('../models/Seat');

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

async function ensureSeatIndexes() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    
    // 기존 인덱스 확인
    const existingIndexes = await Seat.collection.getIndexes();

    // assignedTo 필드의 sparse unique 인덱스 확인
    const hasAssignedToIndex = existingIndexes.hasOwnProperty('assignedTo_1');
    
    if (!hasAssignedToIndex) {
      try {
        // 중복 배정 방지를 위한 sparse unique 인덱스 생성
        await Seat.collection.createIndex(
          { assignedTo: 1 }, 
          { 
            unique: true, 
            sparse: true,
            name: 'assignedTo_unique_sparse'
          }
        );
      } catch (indexError) {
        if (indexError.code === 11000) {
          // 중복 배정 찾기
          const duplicates = await Seat.aggregate([
            { $match: { assignedTo: { $ne: null } } },
            { $group: { _id: '$assignedTo', count: { $sum: 1 }, seats: { $push: '$$ROOT' } } },
            { $match: { count: { $gt: 1 } } }
          ]);
        } else {
          throw indexError;
        }
      }
    }

    // 좌석 번호+섹션 복합 unique 인덱스 확인
    const hasNumberSectionIndex = existingIndexes.hasOwnProperty('number_1_section_1');
    
    if (!hasNumberSectionIndex) {
      try {
        await Seat.collection.createIndex(
          { number: 1, section: 1 }, 
          { 
            unique: true,
            name: 'number_section_unique'
          }
        );
      } catch (indexError) {
        // 오류 처리
      }
    }

    // 모든 인덱스 다시 확인
    const finalIndexes = await Seat.collection.getIndexes();
    
  } catch (error) {
    // 오류 처리
  } finally {
    await mongoose.disconnect();
  }
}

// 스크립트 실행
ensureSeatIndexes(); 