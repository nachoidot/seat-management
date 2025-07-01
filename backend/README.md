# Seat Management Backend

대학원생 좌석 관리 시스템의 백엔드 API 서버입니다.

## 기능

- 사용자 인증 및 권한 관리
- 좌석 배정 및 관리
- 일정 관리
- 관리자 기능
- 로깅 시스템

## 기술 스택

- **Node.js** - 런타임 환경
- **Express.js** - 웹 프레임워크
- **MongoDB** - 데이터베이스
- **Mongoose** - ODM
- **JWT** - 인증
- **bcryptjs** - 비밀번호 해싱
- **Winston** - 로깅
- **Jest** - 테스트 프레임워크

## 설치 및 실행

### 의존성 설치
```bash
npm install
```

### 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/seatmgmt
JWT_SECRET=your_jwt_secret_here
ADMIN_NAME=관리자
ADMIN_PHONE=02-0000-0000
ADMIN_EMAIL=admin@sogang.ac.kr
ADMIN_DEPARTMENT=경제학과
ADMIN_POSITION=주임조교
```

### 개발 서버 실행
```bash
npm run dev
```

### 프로덕션 서버 실행
```bash
npm start
```

## 테스트

### 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 테스트 상태 감시 (파일 변경 시 자동 재실행)
npm run test:watch

# 코드 커버리지 포함 테스트
npm run test:coverage
```

### 테스트 구조

```
backend/__tests__/
├── setup.js                    # 테스트 환경 설정
├── models/                     # 모델 테스트
│   ├── User.test.js
│   ├── Seat.test.js
│   ├── TimeSlot.test.js
│   └── AdminInfo.test.js
├── middleware/                 # 미들웨어 테스트
│   └── auth.test.js
├── utils/                      # 유틸리티 테스트
│   └── logger.test.js
└── controllers/                # 컨트롤러 테스트
    ├── auth.test.js
    ├── seats.test.js
    └── timeslots.test.js
```

### 테스트 작성 가이드

1. **Model 테스트**: 스키마 검증, 기본값, 메서드 동작
2. **Controller 테스트**: API 엔드포인트의 비즈니스 로직
3. **Middleware 테스트**: 인증, 권한 체크 등
4. **Utils 테스트**: 헬퍼 함수 및 유틸리티

### 테스트 환경

- **MongoDB Memory Server**: 인메모리 데이터베이스 사용
- **Jest**: 테스트 프레임워크 및 assertion 라이브러리
- **Supertest**: HTTP assertion (필요시)

## API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보
- `GET /api/auth/logout` - 로그아웃
- `PUT /api/auth/change-password` - 비밀번호 변경

### 좌석 (Seats)
- `GET /api/seats` - 모든 좌석 조회
- `GET /api/seats/:number/:section` - 특정 좌석 조회
- `PUT /api/seats/:number/:section/assign` - 좌석 배정
- `PUT /api/seats/:number/:section/release` - 좌석 해제

### 일정 (TimeSlots)
- `GET /api/timeslots` - 모든 일정 조회
- `POST /api/timeslots` - 일정 생성
- `PUT /api/timeslots/:id` - 일정 수정
- `DELETE /api/timeslots/:id` - 일정 삭제

### 관리자 (Admin)
- `GET /api/admin/users` - 사용자 목록
- `POST /api/admin/users` - 사용자 생성
- `PUT /api/admin/users/:id` - 사용자 수정
- `DELETE /api/admin/users/:id` - 사용자 삭제
- `POST /api/admin/users/bulk` - 사용자 일괄 생성
- `GET /api/admin/seats/export` - 좌석 데이터 엑셀 내보내기

## 프로젝트 구조

```
backend/
├── controllers/        # API 컨트롤러
├── middleware/         # Express 미들웨어
├── models/            # Mongoose 모델
├── routes/            # API 라우트
├── scripts/           # 데이터베이스 스크립트
├── utils/             # 유틸리티 함수
├── __tests__/         # 테스트 파일
├── logs/              # 로그 파일
└── server.js          # 서버 진입점
```

## 로깅

Winston을 사용한 구조화된 로깅:

- **개발환경**: 콘솔 출력 + 파일 저장
- **프로덕션**: 파일 저장 위주
- **로그 레벨**: error, warn, info, debug
- **로그 파일**: `logs/error.log`, `logs/combined.log`

## 데이터베이스 스크립트

```bash
# 좌석 데이터 초기화
node scripts/seed-seats.js

# 사용자 추가
node scripts/addUser.js

# 좌석 인덱스 확인
node scripts/ensure-seat-indexes.js
```

## 보안

- JWT 토큰 기반 인증
- bcrypt를 이용한 비밀번호 해싱
- CORS 설정
- 입력값 검증 및 sanitization
- MongoDB Injection 방지

## 성능 최적화

- 데이터베이스 인덱싱
- 쿼리 최적화
- 응답 압축
- 캐싱 전략

## 배포

### Docker를 사용한 배포
```bash
# Docker 이미지 빌드
docker build -t seat-management-backend .

# 컨테이너 실행
docker run -p 5001:5001 seat-management-backend
```

### PM2를 사용한 배포
```bash
# PM2로 앱 시작
pm2 start server.js --name "seat-management-api"

# PM2 상태 확인
pm2 status
```

## 기여하기

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## 문의

프로젝트 관련 문의사항은 이슈를 생성해 주세요. 