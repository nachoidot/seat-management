// 서버 Wake-up 유틸리티
const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * 서버가 잠들어 있는지 확인하고 깨우기
 */
export const wakeUpServer = async (maxRetries = 5) => {
  if (typeof window === 'undefined') return true; // SSR에서는 실행하지 않음
  
  console.log('🤖 서버 Wake-up 시도 중...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
      
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 서버 깨우기 성공! (시도 ${i + 1}/${maxRetries})`, data.message);
        return true;
      }
    } catch (error) {
      console.log(`⏰ 서버 Wake-up 시도 ${i + 1}/${maxRetries} 실패:`, error.message);
      
      if (i < maxRetries - 1) {
        // 재시도 전 대기 시간 (점진적 증가)
        const waitTime = Math.min(1000 * (i + 1), 5000);
        console.log(`🔄 ${waitTime}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.log('❌ 서버 Wake-up 실패. 서버가 응답하지 않습니다.');
  return false;
};

/**
 * API 요청 전에 서버 상태 확인 및 Wake-up
 */
export const ensureServerAwake = async () => {
  const serverWoken = await wakeUpServer(3);
  
  if (!serverWoken) {
    console.warn('⚠️ 서버가 응답하지 않습니다. 요청이 느려질 수 있습니다.');
  }
  
  return serverWoken;
};

/**
 * 페이지 로드 시 자동 Wake-up
 */
export const autoWakeUpOnLoad = () => {
  if (typeof window === 'undefined') return;
  
  // 페이지 로드 시 즉시 Wake-up 시도
  wakeUpServer(2).then(success => {
    if (success) {
      console.log('🚀 페이지 로드 시 서버 Wake-up 완료');
    }
  });
  
  // Visibility API를 이용해 탭이 다시 활성화될 때 Wake-up
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      wakeUpServer(1).then(success => {
        if (success) {
          console.log('👁️ 탭 활성화 시 서버 Wake-up 완료');
        }
      });
    }
  });
};

/**
 * 주기적 Keep-Alive (클라이언트 사이드)
 */
export const startKeepAlive = (intervalMinutes = 4) => {
  if (typeof window === 'undefined') return null;
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        console.log('💓 Keep-alive ping 성공');
      }
    } catch (error) {
      console.log('💔 Keep-alive ping 실패:', error.message);
    }
  }, intervalMinutes * 60 * 1000);
  
  console.log(`🕐 Keep-alive 시작 (${intervalMinutes}분 간격)`);
  
  // cleanup 함수 반환
  return () => {
    clearInterval(interval);
    console.log('🛑 Keep-alive 중지');
  };
}; 