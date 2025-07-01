/**
 * 좌석 데이터 초기화 스크립트
 * 제공된 좌석 배치도에 따라 좌석 데이터 생성
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Seat = require('../models/Seat');

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

async function createSeats() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 좌석 데이터 정의
    const seatsData = [
      // 504호 좌석
      ...Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        section: '504',
        roomNumber: '504',
        type: 'regular',
        active: true,
        row: Math.floor(i / 3),
        col: i % 3
      })),
      
      // 506호 좌석  
      ...Array.from({ length: 13 }, (_, i) => ({
        number: i + 19,
        section: '506',
        roomNumber: '506',
        type: 'regular',
        active: true,
        row: Math.floor(i / 2),
        col: i % 2 === 0 ? 0 : 2
      })),

      // 508호 좌석
      ...Array.from({ length: 14 }, (_, i) => ({
        number: i + 32,
        section: '508',
        roomNumber: '508',
        type: 'regular',
        active: true,
        row: Math.floor(i / 2),
        col: i % 2 === 0 ? 0 : 2
      })),

      // 510호 좌석
      ...Array.from({ length: 14 }, (_, i) => ({
        number: i + 46,
        section: '510',
        roomNumber: '510',
        type: 'regular',
        active: true,
        row: Math.floor(i / 2),
        col: i % 2 === 0 ? 0 : 2
      })),

      // 박사 연구실 좌석들
      // 501호
      ...Array.from({ length: 4 }, (_, i) => ({
        number: i + 1,
        section: '501',
        roomNumber: '501',
        type: 'phd',
        active: true,
        row: Math.floor(i / 2),
        col: i % 2 === 0 ? 0 : 2
      })),

      // 503호
      ...Array.from({ length: 6 }, (_, i) => ({
        number: i + 5,
        section: '503',
        roomNumber: '503',
        type: 'phd',
        active: true,
        row: Math.floor(i / 2),
        col: i % 2 === 0 ? 0 : 2
      })),

      // 505호
      ...Array.from({ length: 6 }, (_, i) => ({
        number: i + 11,
        section: '505',
        roomNumber: '505',
        type: 'phd',
        active: true,
        row: Math.floor(i / 2),
        col: i % 2 === 0 ? 0 : 2
      })),

      // 507호
      ...Array.from({ length: 6 }, (_, i) => ({
        number: i + 17,
        section: '507',
        roomNumber: '507',
        type: 'phd',
        active: true,
        row: Math.floor(i / 2),
        col: i % 2 === 0 ? 0 : 2
      }))
    ];

    // 기존 좌석 삭제 (선택사항)
    // await Seat.deleteMany({});

    // 새 좌석 생성
    const result = await Seat.insertMany(seatsData);
    
    if (result.length > 0) {
      // 좌석 생성 성공
    } else {
      // 생성할 좌석 데이터가 없음
    }

  } catch (error) {
    // 오류 처리
  } finally {
    await mongoose.disconnect();
  }
}

// 스크립트 실행
createSeats(); 