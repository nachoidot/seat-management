const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the actual User model instead of defining a schema
const User = require('../models/User');

// MongoDB 연결 - 직접 서버 로그에서 본 연결 문자열 사용 (비밀번호는 가려진 상태)
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://wogh1217:5xgbtaixJMlqmNhB@cluster0.srqnajy.mongodb.net/seatmgmt?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoUri)
  .then(async () => {

    // 데이터베이스 정보 확인
    const collections = await mongoose.connection.db.listCollections().toArray();

    // 기존 사용자 확인
    const existingUsers = await User.find();

    // 관리자 사용자 추가
    try {
      // 먼저 같은 studentId를 가진 기존 사용자가 있는지 확인
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

      // 전체 사용자 조회
      const allUsers = await User.find();
    } catch (err) {
      // 오류 처리
    }

    // 연결 종료
    await mongoose.disconnect();
  })
  .catch(err => {
    process.exit(1);
  }); 