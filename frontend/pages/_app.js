import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import '../styles/globals.css';
import { useSessionTimeout, isAuthenticated } from '../utils/auth';
import { autoWakeUpOnLoad, startKeepAlive } from '../utils/wakeup';

// 클라이언트에서만 렌더링되는 앱 컴포넌트
const ClientOnlyApp = ({ Component, pageProps }) => {
  const router = useRouter();
  
  // 세션 타임아웃 훅 사용
  useSessionTimeout();

  useEffect(() => {
    // Add event listener to fix "ResizeObserver loop limit exceeded" error
    const resizeObserverError = error => {
      if (error.message.includes('ResizeObserver loop limit exceeded')) {
        const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
        if (resizeObserverErr) {
          resizeObserverErr.style.display = 'none';
        }
      }
    };
    
    window.addEventListener('error', resizeObserverError);

    // 🤖 서버 Wake-up 시작
    autoWakeUpOnLoad();
    const stopKeepAlive = startKeepAlive(4); // 4분마다 Keep-alive

    return () => {
      window.removeEventListener('error', resizeObserverError);
      // Keep-alive 정리
      if (stopKeepAlive) stopKeepAlive();
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Component {...pageProps} />
    </>
  );
};

// 서버 사이드 렌더링을 비활성화하는 래퍼
const AppWithNoSSR = dynamic(
  () => Promise.resolve(ClientOnlyApp),
  { 
    ssr: false,
    loading: () => <div className="p-4">로딩 중...</div>
  }
);

function MyApp(props) {
  return <AppWithNoSSR {...props} />;
}

export default MyApp; 