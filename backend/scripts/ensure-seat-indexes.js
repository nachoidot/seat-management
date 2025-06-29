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
    
    console.log('MongoDB 연결 완료');

    // 기존 인덱스 확인
    console.log('\n현재 인덱스 확인 중...');
    const existingIndexes = await Seat.collection.getIndexes();
    console.log('기존 인덱스들:', Object.keys(existingIndexes));

    // assignedTo 필드의 sparse unique 인덱스 확인
    const hasAssignedToIndex = existingIndexes.hasOwnProperty('assignedTo_1');
    
    if (hasAssignedToIndex) {
      console.log('✅ assignedTo 인덱스가 이미 존재합니다.');
      console.log('   설정:', existingIndexes['assignedTo_1']);
    } else {
      console.log('🚨 assignedTo 인덱스가 없습니다. 생성 중...');
      
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
        console.log('✅ assignedTo sparse unique 인덱스가 성공적으로 생성되었습니다.');
      } catch (indexError) {
        if (indexError.code === 11000) {
          console.log('🚨 중복 데이터로 인해 인덱스 생성 실패!');
          console.log('   중복 배정된 사용자들을 먼저 정리해야 합니다.');
          
          // 중복 배정 찾기
          const duplicates = await Seat.aggregate([
            { $match: { assignedTo: { $ne: null } } },
            { $group: { _id: '$assignedTo', count: { $sum: 1 }, seats: { $push: '$$ROOT' } } },
            { $match: { count: { $gt: 1 } } }
          ]);
          
          if (duplicates.length > 0) {
            console.log('\n중복 배정된 사용자들:');
            duplicates.forEach(duplicate => {
              console.log(`- ${duplicate._id}: ${duplicate.count}개 좌석`);
              duplicate.seats.forEach(seat => {
                console.log(`  ${seat.roomNumber}호 ${seat.number}번 (${seat.section}) - ${seat.confirmed ? '확정' : '대기'}`);
              });
            });
          }
        } else {
          throw indexError;
        }
      }
    }

    // 좌석 번호+섹션 복합 unique 인덱스 확인
    const hasNumberSectionIndex = existingIndexes.hasOwnProperty('number_1_section_1');
    
    if (hasNumberSectionIndex) {
      console.log('\n✅ number+section 복합 인덱스가 이미 존재합니다.');
    } else {
      console.log('\n🚨 number+section 복합 인덱스가 없습니다. 생성 중...');
      try {
        await Seat.collection.createIndex(
          { number: 1, section: 1 }, 
          { 
            unique: true,
            name: 'number_section_unique'
          }
        );
        console.log('✅ number+section 복합 unique 인덱스가 성공적으로 생성되었습니다.');
      } catch (indexError) {
        console.log('🚨 number+section 인덱스 생성 실패:', indexError.message);
      }
    }

    // 모든 인덱스 다시 확인
    console.log('\n최종 인덱스 확인:');
    const finalIndexes = await Seat.collection.getIndexes();
    Object.keys(finalIndexes).forEach(indexName => {
      const index = finalIndexes[indexName];
      console.log(`- ${indexName}:`, index.key, index.unique ? '(unique)' : '', index.sparse ? '(sparse)' : '');
    });
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDB 연결 종료');
  }
}

// 스크립트 실행
ensureSeatIndexes(); 