const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the actual User model instead of defining a schema
const User = require('../models/User');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

mongoose.connect(mongoUri)
  .then(async () => {

    // 데이터베이스 정보 확인
    const collections = await mongoose.connection.db.listCollections().toArray();

    // 관리자 사용자 추가
    try {
      const existingAdmin = await User.findOne({ studentId: 'admin' });
      if (!existingAdmin) {
        const admin = await User.create({
          studentId: 'admin',
          name: '관리자',
          password: 'sg1234',
          birthdate: '19900101',
          priority: 1,
          isAdmin: true
        });
      }
      
      // 테스트 사용자 추가
      const existingTest = await User.findOne({ studentId: 'test123' });
      if (!existingTest) {
        const testUser = await User.create({
          studentId: 'test123',
          name: '테스트',
          password: 'sg1234',
          birthdate: '20000101',
          priority: 1,
          isAdmin: true
        });
      }

    } catch (err) {
      // 오류 처리
    }

    // 연결 종료
    await mongoose.disconnect();
  })
  .catch(err => {
    process.exit(1);
  }); 