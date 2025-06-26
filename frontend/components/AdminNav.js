import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHome, FaChair, FaCalendarAlt, FaUsers, FaSignOutAlt, FaTachometerAlt, FaBars, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { logout } from '../utils/auth';

export default function AdminNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    
    // 확인 다이얼로그
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      logout();
    }
  };

  const isActive = (path) => {
    return router.pathname === path ? 'bg-blue-700' : '';
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Return null during server-side rendering
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <div className="admin-nav-container">
      {/* 모바일 메뉴 토글 버튼 */}
      <div className="md:hidden bg-primary text-white p-4 fixed top-0 left-0 right-0 z-50 flex justify-between items-center">
        <span className="font-bold text-lg">연구실 자리 배정</span>
        <button onClick={toggleMobileMenu} className="focus:outline-none">
          {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {/* 사이드바 네비게이션 (모바일에서는 토글 메뉴) */}
      <div className={`
        bg-primary text-white w-64 fixed h-full transition-transform duration-300 transform
        md:translate-x-0 z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5">
          <h1 className="text-xl font-bold">관리자 대시보드</h1>
        </div>
        
        <nav className="mt-5">
          <ul>
            <li>
              <Link href="/admin" className={`flex items-center px-5 py-3 hover:bg-secondary ${isActive('/admin')}`}>
                <FaTachometerAlt className="mr-3" /> 대시보드
              </Link>
            </li>
            <li>
              <Link href="/admin/seats" className={`flex items-center px-5 py-3 hover:bg-secondary ${isActive('/admin/seats')}`}>
                <FaChair className="mr-3" /> 좌석 관리
              </Link>
            </li>
            <li>
              <Link href="/admin/timeslots" className={`flex items-center px-5 py-3 hover:bg-secondary ${isActive('/admin/timeslots')}`}>
                <FaCalendarAlt className="mr-3" /> 일정 관리
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className={`flex items-center px-5 py-3 hover:bg-secondary ${isActive('/admin/users')}`}>
                <FaUsers className="mr-3" /> 사용자 관리
              </Link>
            </li>
            <li>
              <Link href="/admin/info" className={`flex items-center px-5 py-3 hover:bg-secondary ${isActive('/admin/info')}`}>
                <FaInfoCircle className="mr-3" /> 관리자 정보
              </Link>
            </li>
            <li>
              <Link href="/" className={`flex items-center px-5 py-3 hover:bg-secondary ${isActive('/')}`}>
                <FaHome className="mr-3" /> 메인 페이지
              </Link>
            </li>
            <li>
              <button 
                onClick={handleLogout}
                className="w-full text-left flex items-center px-5 py-3 hover:bg-secondary transition-colors"
              >
                <FaSignOutAlt className="mr-3" /> 로그아웃
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* 모바일 메뉴가 열려 있을 때 배경 오버레이 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" 
          onClick={toggleMobileMenu}
        />
      )}
    </div>
  );
} 