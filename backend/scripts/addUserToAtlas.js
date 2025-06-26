const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB 연결 - 직접 서버 로그에서 본 연결 문자열 사용 (비밀번호는 가려진 상태)
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://wogh1217:5xgbtaixJMlqmNhB@cluster0.srqnajy.mongodb.net/seatmgmt?retryWrites=true&w=majority&appName=Cluster0';
console.log('MongoDB 연결 시도...');

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('MongoDB Atlas 연결 성공');
    
    // User 스키마 정의
    const UserSchema = new mongoose.Schema({
      studentId: {
        type: String,
        required: [true, 'Please add a student ID'],
        unique: true,
        trim: true
      },
      name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
      },
      birthdate: {
        type: String,
        required: [true, 'Please add a birthdate'],
        trim: true
      },
      priority: {
        type: Number,
        default: 3,
        min: 1,
        max: 3
      },
      isAdmin: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    });

    // User 모델 생성 - 명시적으로 'users' 컬렉션 사용
    const User = mongoose.model('User', UserSchema, 'users');

    // 데이터베이스 정보 확인
    console.log('데이터베이스 이름:', mongoose.connection.db.databaseName);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('컬렉션 목록:', collections.map(c => c.name));

    // 기존 사용자 확인
    const existingUsers = await User.find();
    console.log('기존 사용자 수:', existingUsers.length);
    
    if (existingUsers.length > 0) {
      console.log('기존 사용자 목록:', existingUsers.map(u => ({
        id: u.studentId,
        name: u.name,
        birthdate: u.birthdate
      })));
    }

    // 관리자 사용자 추가
    try {
      // 먼저 같은 studentId를 가진 기존 사용자가 있는지 확인
      const existingAdmin = await User.findOne({ studentId: 'admin' });
      if (existingAdmin) {
        console.log('이미 admin 사용자가 존재합니다:', existingAdmin);
      } else {
        const admin = await User.create({
          studentId: 'admin',
          name: '관리자',
          birthdate: '19900101',
          priority: 1,
          isAdmin: true
        });
        console.log('관리자 사용자 추가 성공:', admin);
      }
      
      // 테스트 사용자 추가
      const existingTest = await User.findOne({ studentId: 'test123' });
      if (existingTest) {
        console.log('이미 test123 사용자가 존재합니다:', existingTest);
      } else {
        const testUser = await User.create({
          studentId: 'test123',
          name: '테스트',
          birthdate: '20000101',
          priority: 1,
          isAdmin: true
        });
        console.log('테스트 사용자 추가 성공:', testUser);
      }

      // 전체 사용자 조회
      const allUsers = await User.find();
      console.log(`전체 사용자 수: ${allUsers.length}`);
      console.log('사용자 목록:', allUsers.map(u => ({ 
        id: u.studentId, 
        name: u.name, 
        birthdate: u.birthdate 
      })));
    } catch (err) {
      console.error('사용자 추가 오류:', err);
    }

    // 연결 종료
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  })
  .catch(err => {
    console.error('MongoDB 연결 오류:', err);
    process.exit(1);
  }); 