const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// CORS 설정 강화
const origins = [
  process.env.FRONTEND_URL,                                           // Vercel 도메인
].filter(Boolean); // undefined 값 제거

if (process.env.NODE_ENV === 'development') {
  console.log('허용된 CORS Origins:', origins);
}

app.use(cors({
  origin: origins,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// preflight(OPTIONS) 요청도 CORS 적용
app.options('*', cors({
  origin: origins,
  credentials: true
}));

// 기본 미들웨어 - 이 부분이 로깅 미들웨어보다 먼저 와야 함
app.use(express.json());
app.use(cookieParser());

// 개발 환경에서만 상세 로깅
if (process.env.NODE_ENV === 'development') {
  // 요청 로깅 미들웨어 (개발 환경에서만 - 민감정보 제외)
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // 민감정보가 포함될 수 있는 헤더와 본문은 로깅하지 않음
    
    next();
  });
}

// Database connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmgmt';

if (process.env.NODE_ENV === 'development') {
  console.log('MongoDB 연결 시도... 문자열 (민감한 정보 일부 가림):', 
    mongoUri.replace(/:([^:@]+)@/, ':****@'));
}

// 연결 옵션 명시적 설정
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // 서버 선택 제한시간 5초
};

mongoose.connect(mongoUri, mongooseOptions)
  .then(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('MongoDB 연결 성공!');
      console.log('데이터베이스 이름:', mongoose.connection.db.databaseName);
    }
    // 모든 컬렉션 이름 출력
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    if (process.env.NODE_ENV === 'development') {
      console.log('컬렉션 목록:', collections.map(c => c.name));
    }
    
    // timeslots 컬렉션 생성 확인
    const hasTimeslotsCollection = collections.some(c => c.name === 'timeslots');
    if (!hasTimeslotsCollection && process.env.NODE_ENV === 'development') {
      console.log('timeslots 컬렉션이 없습니다. 첫 번째 일정이 추가되면 자동 생성될 것입니다.');
    } else if (hasTimeslotsCollection && process.env.NODE_ENV === 'development') {
      console.log('timeslots 컬렉션이 이미 존재합니다.');
      // timeslots 컬렉션 데이터 확인
      return mongoose.connection.db.collection('timeslots').countDocuments()
        .then(count => {
          console.log('TimeSlots 컬렉션 문서 수:', count);
          if (count > 0) {
            return mongoose.connection.db.collection('timeslots').find({}).limit(2).toArray()
              .then(samples => {
                console.log('TimeSlots 샘플 수:', samples.length);
              });
          }
        });
    }
  })
  .then(() => {
    // 개발 환경에서만 User 컬렉션 데이터 확인
    if (process.env.NODE_ENV === 'development') {
      return mongoose.connection.db.collection('users').countDocuments();
    }
  })
  .then(count => {
    if (process.env.NODE_ENV === 'development' && count !== undefined) {
      console.log('Users 컬렉션 문서 수:', count);
      // 간단한 사용자 조회 테스트
      if (count > 0) {
        return mongoose.connection.db.collection('users').find({}).toArray();
      }
    }
    return [];
  })
  .then(users => {
    if (process.env.NODE_ENV === 'development' && users.length > 0) {
      console.log('사용자 데이터 수:', users.length);
    }
  })
  .catch(err => {
    console.error('MongoDB 연결 오류:', err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('스택 트레이스:', err.stack);
    }
  });

// Import Routes
const authRoutes = require('./routes/auth');
const seatRoutes = require('./routes/seats');
const timeslotRoutes = require('./routes/timeslots');
const adminRoutes = require('./routes/admin');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/timeslots', timeslotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', require('./routes/health'));

// 개발 환경에서만 데이터 진단용 API 경로 추가
if (process.env.NODE_ENV === 'development') {
  app.get('/api/debug/stats', async (req, res) => {
    try {
      const usersCount = await mongoose.connection.db.collection('users').countDocuments();
      const seatsCount = await mongoose.connection.db.collection('seats').countDocuments();
      const timeslotsCount = await mongoose.connection.db.collection('timeslots').countDocuments();
      
      return res.status(200).json({
        success: true,
        stats: {
          usersCount,
          seatsCount,
          timeslotsCount,
          dbName: mongoose.connection.db.databaseName,
          collections: await mongoose.connection.db.listCollections().toArray().then(cols => cols.map(c => c.name))
        }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: '데이터 통계 조회 중 오류가 발생했습니다.',
        error: err.message
      });
    }
  });
}

// Root route
app.get('/', (req, res) => {
  res.send('Seat Management API is running');
});

// 404 에러 핸들러 (존재하지 않는 경로)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 경로를 찾을 수 없습니다'
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 오류:', err.message);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
}); 