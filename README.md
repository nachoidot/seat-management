# 연구실 자리 배정 시스템

대학원 연구실 석사/박사 과정 학생들의 자리 신청 및 배정을 자동화하는 웹 애플리케이션입니다.

## 🛠 기술 스택

### 백엔드
- **Node.js** + **Express.js**
- **MongoDB** (MongoDB Atlas)
- **JWT** 인증
- **CORS** 설정
- **File Upload** (multer)

### 프론트엔드
- **Next.js**
- **React**
- **TailwindCSS**
- **Axios**
- **React Icons**
- **React Toastify**

## 🚀 배포

- 프론트엔드: **Vercel**
- 백엔드: **CloudType**
- 데이터베이스: **MongoDB Atlas**

## 🏗 프로젝트 구조

```
seat-management/
├── backend/                # Express.js 백엔드
│   ├── controllers/        # API 컨트롤러들
│   │   ├── admin.js        # 관리자 기능 (통계, 사용자 관리, 좌석 관리)
│   │   ├── auth.js         # 인증 관련
│   │   ├── seats.js        # 좌석 배정 로직
│   │   └── timeslots.js    # 시간 슬롯 관리
│   ├── middleware/         # 미들웨어 함수들
│   │   └── auth.js         # JWT 인증 미들웨어
│   ├── models/             # MongoDB 모델들
│   │   ├── AdminInfo.js    # 관리자 정보 모델
│   │   ├── Seat.js         # 좌석 모델
│   │   ├── TimeSlot.js     # 시간 슬롯 모델
│   │   └── User.js         # 사용자 모델
│   ├── routes/             # API 라우트들
│   ├── scripts/            # 데이터베이스 스크립트들
│   ├── .env                # 환경 변수 설정
│   ├── package.json        # 의존성 관리
│   └── server.js           # 서버 진입점
│
└── frontend/               # Next.js 프론트엔드
    ├── components/         # 재사용 가능한 컴포넌트들
    │   ├── AdminNav.js     # 관리자 네비게이션
    │   ├── Footer.js       # 푸터
    │   ├── Header.js       # 헤더 (세션 타임아웃 표시)
    │   ├── Layout.js       # 레이아웃 래퍼
    │   └── SeatGrid.js     # 좌석 배치도
    ├── pages/              # 페이지 컴포넌트들
    │   ├── admin/          # 관리자 페이지들
    │   │   ├── index.js    # 관리자 대시보드
    │   │   ├── info.js     # 관리자 정보 관리
    │   │   ├── seats.js    # 좌석 관리 (3탭 구조)
    │   │   ├── timeslots.js # 시간 슬롯 관리
    │   │   └── users.js    # 사용자 관리
    │   ├── _app.js         # 앱 초기화
    │   ├── index.js        # 메인 페이지
    │   └── login.js        # 로그인 페이지
    ├── public/             # 정적 파일들
    ├── styles/             # CSS 스타일
    ├── utils/              # 유틸리티 함수들
    │   ├── api.js          # API 호출 함수들
    │   ├── auth.js         # 인증 관련 함수들
    │   ├── client-only.js  # 클라이언트 전용 컴포넌트
    │   └── timeUtils.js    # 시간 계산 유틸리티
    ├── .env.local          # 환경 변수 설정
    └── package.json        # 의존성 관리
```

## ⚙️ 설치 및 실행

### 사전 요구사항
- Node.js 16 이상
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
PORT=5001
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret_key>
JWT_EXPIRE=30m
NODE_ENV=development
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
NEXT_PUBLIC_API_URL=https://port-0-seat-management-mcdii4ecc60f3aad.sel5.cloudtype.app/api
```

4. 개발 서버 실행
```bash
npm run dev
```

## 📋 주요 기능

### 사용자 (학생)
- **로그인 시스템**: 학번/수험번호와 이름으로 간편 로그인
- **우선순위별 접근 제어**: 1~12순위별 차등 시간 배정
  - 1순위(수료생), 12순위(기타): 15:00부터 배정 종료까지
  - 2~11순위: 개별 배정 시간 + 15:00 이후 추가 접근
- **실시간 좌석 배치도**: 501~510호 연구실 좌석 현황 확인
- **좌석 신청/취소**: 클릭 한 번으로 간편한 좌석 관리
- **세션 타임아웃**: 30분 비활성 시 자동 로그아웃 (5분 전 경고)

### 관리자
#### 📊 대시보드
- **종합 통계**: 사용자 수, 좌석 현황, 배정률, 확정률
- **좌석 유형별 현황**: 석사/박사과정 좌석 분류
- **방별 배정 현황**: 501~510호 각 방별 상세 통계

#### 🪑 좌석 관리 (3탭 구조)
- **좌석 배치도**: 시각적 좌석 그리드, 실시간 상태 확인
- **신청 좌석 확정**: 일괄 확정 기능 (전체/방별/선택적)
- **좌석 목록 관리**: 테이블 형태 좌석 관리, Excel 다운로드

#### 👥 사용자 관리
- **CSV 일괄 업로드**: 드래그앤드롭으로 사용자 대량 등록
- **템플릿 다운로드**: 한글 인코딩 지원 CSV 템플릿
- **체크박스 선택**: 다중 선택을 통한 일괄 삭제
- **실시간 검증**: 중복 학번, 필수 필드 등 즉시 확인

#### ⏰ 시간 슬롯 관리
- **우선순위별 시간 설정**: 12개 우선순위 그룹별 배정 시간
- **일정 생성/수정/삭제**: 새로운 배정 일정 관리
- **활성 일정 설정**: 현재 진행 중인 배정 일정 선택

#### ℹ️ 관리자 정보 관리
- **연락처 정보 설정**: 이름, 전화번호, 이메일, 학과, 직책
- **로그인 페이지 연동**: 입력한 정보가 자동으로 로그인 페이지에 표시
- **실시간 미리보기**: 변경사항 즉시 확인

### 🔐 보안 기능
- **JWT 기반 인증**: 안전한 토큰 기반 로그인
- **관리자 권한 분리**: 일반 사용자와 관리자 권한 구분
- **세션 관리**: 자동 로그아웃 및 보안 세션 유지
- **CORS 보안**: 허용된 도메인만 API 접근 가능

### 📱 반응형 디자인
- **모바일 최적화**: 모든 기능이 모바일에서 완벽 작동
- **태블릿 지원**: 중간 크기 화면에 최적화된 레이아웃
- **데스크톱 버전**: 넓은 화면을 활용한 효율적 인터페이스

## 🎯 우선순위 시스템

시스템은 12개의 우선순위 그룹으로 사용자를 분류합니다:

1. **1순위**: 수료생 - 15:00부터 접근
2. **2~11순위**: 각자 지정된 시간 + 15:00 이후 추가 접근
3. **12순위**: 기타 - 15:00부터 접근

이 시스템을 통해 공정한 좌석 배정과 효율적인 자원 관리가 가능합니다.

## 🚀 배포 환경

### 프로덕션 URL
- **프론트엔드**: https://seat-management-el5wgnzgi-jaeho-chois-projects.vercel.app
- **백엔드**: https://port-0-seat-management-mcdii4ecc60f3aad.sel5.cloudtype.app

### 환경 설정
각 배포 환경에서는 다음 환경변수들이 설정되어야 합니다:

**백엔드 (CloudType)**:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
JWT_EXPIRE=30m
PORT=5001
NODE_ENV=production
```

**프론트엔드 (Vercel)**:
```
NEXT_PUBLIC_API_URL=https://port-0-seat-management-mcdii4ecc60f3aad.sel5.cloudtype.app/api
```

## 👨‍💻 개발자

**최재호** (Jaeho Choi) AI finLab
- 서강대학교 경제학과 대학원 연구실 자리 배정 시스템 개발
- Email: [wogh1217@sogang.ac.kr]


## 📄 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 