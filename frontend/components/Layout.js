import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import 'react-toastify/dist/ReactToastify.css';
import Header from './Header';
import Footer from './Footer';

// ToastContainer를 클라이언트 사이드에서만 렌더링하도록 dynamic import 사용
const ToastContainer = dynamic(
  () => import('react-toastify').then((mod) => mod.ToastContainer),
  { ssr: false }
);

const Layout = ({ title, description, keywords, children }) => {
  const router = useRouter();
  const [isLoginPage, setIsLoginPage] = useState(false);

  useEffect(() => {
    setIsLoginPage(router.pathname === '/login');
  }, [router.pathname]);

  // 클라이언트 사이드에서만 확인
  const isClient = typeof window !== 'undefined';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="icon" href="/images/logo.png" />
      </Head>

      <div className="flex flex-col min-h-screen">
        {(!isLoginPage || !isClient) && <Header />}
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
      
      {isClient && (
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      )}
    </>
  );
};

Layout.defaultProps = {
  title: '연구실 자리 배정 시스템',
  description: '대학원 연구실 석사 과정 학생들의 자리 신청 및 배정 시스템',
  keywords: '연구실, 자리 배정, 대학원',
};

export default Layout; 