const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Seat = require('../models/Seat');
const User = require('../models/User');

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

async function fixDuplicateAssignments() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 중복 배정 찾기
    const duplicates = await Seat.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 }, seats: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length === 0) {
      return;
    }

    // 각 중복 사용자 처리
    for (const duplicate of duplicates) {
      const studentId = duplicate._id;
      const seats = duplicate.seats;

      // 사용자 정보 조회
      const user = await User.findOne({ studentId });

      // 좌석 정보 출력
      seats.forEach((seat, index) => {
        // 처리할 좌석 선택 (첫 번째를 유지, 나머지 제거)
      });

      const [keepSeat, ...removeSeats] = seats;

      // 제거할 좌석들의 배정 해제
      for (const removeSeat of removeSeats) {
        await Seat.findByIdAndUpdate(removeSeat._id, {
          $unset: { assignedTo: 1 },
          confirmed: false
        });
      }
    }

    // 결과 확인
    const remainingDuplicates = await Seat.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (remainingDuplicates.length === 0) {
      // sparse unique 인덱스 생성 시도
      try {
        await Seat.collection.createIndex(
          { assignedTo: 1 }, 
          { 
            unique: true, 
            sparse: true,
            name: 'assignedTo_unique_sparse'
          }
        );
      } catch (indexError) {
        // 인덱스 생성 실패
      }
    }

    // 최종 통계
    const totalAssigned = await Seat.countDocuments({ assignedTo: { $ne: null } });
    const uniqueUsers = await Seat.distinct('assignedTo', { assignedTo: { $ne: null } });

  } catch (error) {
    // 오류 처리
  } finally {
    await mongoose.disconnect();
  }
}

// 스크립트 실행
fixDuplicateAssignments();

module.exports = fixDuplicateAssignments; 