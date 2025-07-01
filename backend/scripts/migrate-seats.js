/**
 * 좌석 데이터 마이그레이션 스크립트
 * 기존 seatId 형식에서 number, section 형식으로 변환
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Seat = require('../models/Seat');

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

async function migrateSeats() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 모든 좌석 조회
    const seats = await Seat.find({});

    // 각 좌석에 대해 누락된 필드 추가 또는 업데이트
    const updateOperations = seats.map(seat => {
      const updateData = {};

      // roomNumber가 없으면 section으로 설정
      if (!seat.roomNumber && seat.section) {
        updateData.roomNumber = seat.section;
      }

      // type이 없으면 기본값 설정
      if (!seat.type) {
        // 박사 연구실 방 번호들
        const phdRooms = ['501', '503', '505', '507'];
        updateData.type = phdRooms.includes(seat.section) ? 'phd' : 'regular';
      }

      // active가 없으면 true로 설정
      if (seat.active === undefined) {
        updateData.active = true;
      }

      // row, col이 없으면 기본값 설정
      if (seat.row === undefined || seat.col === undefined) {
        const number = parseInt(seat.number) || 1;
        updateData.row = Math.floor((number - 1) / 3);
        updateData.col = (number - 1) % 3;
      }

      return {
        updateOne: {
          filter: { _id: seat._id },
          update: { $set: updateData }
        }
      };
    }).filter(op => Object.keys(op.updateOne.update.$set).length > 0);

    // 업데이트 실행
    if (updateOperations.length > 0) {
      const result = await Seat.bulkWrite(updateOperations);
    } else {
      // 업데이트할 좌석 데이터가 없음
    }

  } catch (error) {
    // 오류 처리
  } finally {
    await mongoose.disconnect();
  }
}

// 스크립트 실행
migrateSeats(); 