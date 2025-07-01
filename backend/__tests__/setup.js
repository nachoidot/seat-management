const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// 테스트 시작 전 MongoDB 메모리 서버 설정
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// 각 테스트 후 데이터 정리
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// 테스트 종료 후 연결 종료
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_NAME = 'Test Admin';
process.env.ADMIN_PHONE = '02-0000-0000';
process.env.ADMIN_EMAIL = 'test@test.com';
process.env.ADMIN_DEPARTMENT = 'Test Department';
process.env.ADMIN_POSITION = 'Test Position'; 