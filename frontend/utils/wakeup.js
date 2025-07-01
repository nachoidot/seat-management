import axios from 'axios';

// 서버 Wake-up 유틸리티
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// 개발환경에서만 로그 출력
const log = (message, ...args) => {
  if (process.env.NODE_ENV === 'development') {
    // console.log 제거
  }
};

const logError = (message, ...args) => {
  if (process.env.NODE_ENV === 'development') {
    // console.log 제거
  }
};

/**
 * 서버가 잠들어 있는지 확인하고 깨우기
 */
export const wakeUpServer = async (maxRetries = 5) => {
  if (typeof window === 'undefined') return true; // SSR에서는 실행하지 않음
  
  // console.log 제거
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 15000, // 15초 타임아웃
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data) {
        // console.log 제거
        return true;
      }
    } catch (error) {
      // console.log 제거
      
      if (i < maxRetries - 1) {
        // 재시도 전 대기 시간 (점진적 증가)
        const waitTime = Math.min(1000 * (i + 1), 5000);
        // console.log 제거
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // console.log 제거
  return false;
};

/**
 * API 요청 전에 서버 상태 확인 및 Wake-up
 */
export const ensureServerAwake = async (maxRetries = 3) => {
  if (!API_URL) {
    return true; // API URL이 없으면 로컬 환경으로 간주
  }

  log('🤖 서버 Wake-up 시도 중...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data) {
        const data = response.data;
        log(`✅ 서버 깨우기 성공! (시도 ${i + 1}/${maxRetries})`, data.message);
        return true;
      }
    } catch (error) {
      logError(`⏰ 서버 Wake-up 시도 ${i + 1}/${maxRetries} 실패:`, error.message);
      
      if (i < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 5000);
        log(`🔄 ${waitTime}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('❌ 서버 Wake-up 실패. 서버가 응답하지 않습니다.');
    console.warn('⚠️ 서버가 응답하지 않습니다. 요청이 느려질 수 있습니다.');
  }
  return false;
};

/**
 * 페이지 로드 시 자동 Wake-up
 */
export const autoWakeUpOnLoad = () => {
  if (typeof window === 'undefined') return;
  
  // 페이지 로드 시 즉시 Wake-up 시도
  wakeUpServer(2).then(success => {
    // console.log 제거
  });
  
  // Visibility API를 이용해 탭이 다시 활성화될 때 Wake-up
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      wakeUpServer(1).then(success => {
        // console.log 제거
      });
    }
  });
};

/**
 * 페이지 로드 시 서버 깨우기
 */
export const wakeupOnPageLoad = async () => {
  try {
    await ensureServerAwake();
    log('🚀 페이지 로드 시 서버 Wake-up 완료');
  } catch (error) {
    // 무시 - 페이지 로드 시에는 실패해도 계속 진행
  }
};

/**
 * 탭 활성화 시 서버 깨우기
 */
export const wakeupOnFocus = async () => {
  try {
    await ensureServerAwake(1); // 한 번만 시도
    log('👁️ 탭 활성화 시 서버 Wake-up 완료');
  } catch (error) {
    // 무시 - 포커스 시에는 실패해도 계속 진행
  }
};

// Keep-alive 시스템
let keepAliveInterval = null;

const pingServer = async () => {
  try {
    await axios.get(`${API_URL}/health`, { timeout: 5000 });
    log('💓 Keep-alive ping 성공');
  } catch (error) {
    logError('💔 Keep-alive ping 실패:', error.message);
  }
};

export const startKeepAlive = (intervalMinutes = 10) => {
  if (!API_URL || keepAliveInterval) return;
  
  log(`🕐 Keep-alive 시작 (${intervalMinutes}분 간격)`);
  keepAliveInterval = setInterval(pingServer, intervalMinutes * 60 * 1000);
};

export const stopKeepAlive = () => {
  if (keepAliveInterval) {
    log('🛑 Keep-alive 중지');
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}; 