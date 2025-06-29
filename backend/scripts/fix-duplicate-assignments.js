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
    
    console.log('MongoDB 연결 완료');

    // 중복 배정 찾기
    console.log('\n중복 배정 검색 중...');
    const duplicates = await Seat.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 }, seats: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ 중복 배정이 없습니다.');
      return;
    }

    console.log(`🚨 ${duplicates.length}명의 사용자가 중복 배정되었습니다.`);

    for (const duplicate of duplicates) {
      const studentId = duplicate._id;
      const seats = duplicate.seats;
      
      console.log(`\n처리 중: ${studentId} (${seats.length}개 좌석)`);
      
      // 사용자 정보 조회
      const user = await User.findOne({ studentId: studentId });
      console.log(`  사용자 정보: ${user ? user.name : '찾을 수 없음'} (우선순위: ${user ? user.priority : 'N/A'})`);
      
      // 좌석 목록 표시
      seats.forEach((seat, index) => {
        console.log(`  ${index + 1}. ${seat.roomNumber}호 ${seat.number}번 (${seat.section}) - ${seat.confirmed ? '확정' : '대기'} - 생성일: ${seat.createdAt}`);
      });

      // 정리 정책: 가장 최근에 배정된 좌석 1개만 유지
      const sortedSeats = seats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const keepSeat = sortedSeats[0];
      const removeSeats = sortedSeats.slice(1);

      console.log(`  유지할 좌석: ${keepSeat.roomNumber}호 ${keepSeat.number}번`);
      console.log(`  제거할 좌석: ${removeSeats.length}개`);

      // 중복 좌석들 배정 해제
      for (const removeSeat of removeSeats) {
        await Seat.findByIdAndUpdate(
          removeSeat._id,
          { 
            assignedTo: null, 
            confirmed: false,
            updatedAt: Date.now()
          }
        );
        console.log(`    제거됨: ${removeSeat.roomNumber}호 ${removeSeat.number}번`);
      }

      console.log(`  ✅ ${studentId} 중복 배정 정리 완료`);
    }

    // 정리 결과 확인
    console.log('\n정리 결과 확인 중...');
    const remainingDuplicates = await Seat.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (remainingDuplicates.length === 0) {
      console.log('✅ 모든 중복 배정이 정리되었습니다.');
      
      // 이제 sparse unique 인덱스 생성 시도
      console.log('\nsparse unique 인덱스 생성 시도 중...');
      try {
        await Seat.collection.createIndex(
          { assignedTo: 1 }, 
          { 
            unique: true, 
            sparse: true,
            name: 'assignedTo_unique_sparse'
          }
        );
        console.log('✅ assignedTo sparse unique 인덱스가 성공적으로 생성되었습니다.');
      } catch (indexError) {
        console.log('🚨 인덱스 생성 실패:', indexError.message);
      }
    } else {
      console.log(`🚨 여전히 ${remainingDuplicates.length}개의 중복 배정이 남아있습니다.`);
    }

    // 최종 통계
    const totalAssigned = await Seat.countDocuments({ assignedTo: { $ne: null } });
    const uniqueUsers = await Seat.distinct('assignedTo', { assignedTo: { $ne: null } });
    
    console.log('\n최종 통계:');
    console.log(`- 배정된 좌석 수: ${totalAssigned}`);
    console.log(`- 좌석을 가진 사용자 수: ${uniqueUsers.length}`);
    console.log(`- 평균 좌석 수: ${(totalAssigned / uniqueUsers.length).toFixed(2)}`);

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  fixDuplicateAssignments();
}

module.exports = fixDuplicateAssignments; 