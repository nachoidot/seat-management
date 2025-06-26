# 연구실 자리 배정 시스템

대학원 연구실 석사 과정 학생들의 자리 신청 및 배정을 자동화하는 웹 애플리케이션입니다.

## 🛠 기술 스택

### 백엔드
- **Node.js** + **Express.js**
- **MongoDB** (MongoDB Atlas)
- **JWT** 인증

### 프론트엔드
- **Next.js**
- **React**
- **TailwindCSS**
- **Axios**

## 🚀 배포

- 프론트엔드: **Vercel**
- 백엔드: **cloudtype**
- 데이터베이스: **MongoDB Atlas**

## 🏗 프로젝트 구조

```
seat-management/
├── backend/                # Express.js 백엔드
│   ├── controllers/        # API 컨트롤러들
│   ├── middleware/         # 미들웨어 함수들
│   ├── models/             # MongoDB 모델들
│   ├── routes/             # API 라우트들
│   ├── .env                # 환경 변수 설정
│   ├── package.json        # 의존성 관리
│   └── server.js           # 서버 진입점
│
└── frontend/               # Next.js 프론트엔드
    ├── components/         # 재사용 가능한 컴포넌트들
    ├── pages/              # 페이지 컴포넌트들
    ├── public/             # 정적 파일들
    ├── styles/             # CSS 스타일
    ├── utils/              # 유틸리티 함수들
    ├── .env.local          # 환경 변수 설정
    └── package.json        # 의존성 관리
```

## ⚙️ 설치 및 실행

### 사전 요구사항
- Node.js 14 이상
- npm 또는 yarn
- MongoDB 접속 정보

### 백엔드 설정
1. 백엔드 디렉토리로 이동
```bash
cd seat-management/backend
```

2. 의존성 설치
```bash
npm install
```

3. `.env` 파일 생성 및 환경 변수 설정
```
PORT=5000
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret_key>
JWT_EXPIRE=1d
```

4. 서버 실행
```bash
npm run dev
```

### 프론트엔드 설정
1. 프론트엔드 디렉토리로 이동
```bash
cd seat-management/frontend
```

2. 의존성 설치
```bash
npm install
```

3. `.env.local` 파일 생성 및 환경 변수 설정
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. 개발 서버 실행
```bash
npm run dev
```

## 📋 주요 기능

### 사용자 (학생)
- 학번/수험번호, 이름, 생년월일로 로그인
- 우선순위 기반 자리 신청 가능 기간 확인
- 실시간 좌석 배치도를 통한 자리 신청
- 자리 신청 취소 기능

### 관리자
- 신청 현황 조회 및 관리
- 신청 시간 설정 (우선순위별)
- 좌석 수동 배정/확정
- 좌석 배정 결과 Excel 다운로드
- 좌석 초기화 기능

## 👥 기여자

대학원 연구실 자리 배정 자동화 시스템 개발팀

## 📄 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 
