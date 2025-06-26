import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaUserGraduate, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { getCurrentUser, clearAuth, isAdmin } from '../utils/auth';

const Header = () => {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const isClient = typeof window !== 'undefined';

  useEffect(() => {
    if (!isClient) return;
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, [isClient]);

  const handleLogout = () => {
    if (!isClient) return;
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="bg-primary shadow-md">
      <div className="container mx-auto flex justify-between items-center px-4 py-4">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              {isClient && <img src="/images/logo.png" alt="서강대학교 로고" className="h-10 w-auto mr-3" />}
              <span className="text-white font-bold text-xl">연구실 자리 배정</span>
            </div>
          </Link>
        </div>

        <div className="relative">
          {user && isClient ? (
            <>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-white hover:text-accent focus:outline-none transition duration-150 ease-in-out"
              >
                <FaUserGraduate className="mr-1" />
                <span className="hidden md:inline-block">{user.name}</span>
                <span className="ml-1 text-xs bg-white text-primary px-2 py-1 rounded-full">
                  {user.isAdmin ? '관리자' : `${user.priority}순위`}
                </span>
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  {isAdmin() && (
                    <Link href="/admin">
                      <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        <FaCog className="mr-2" />
                        관리자 페이지
                      </div>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FaSignOutAlt className="mr-2" />
                    로그아웃
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login">
              <div className="text-white hover:text-accent cursor-pointer">로그인</div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 