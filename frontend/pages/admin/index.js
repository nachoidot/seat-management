import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';
import { getSeats, getUsers, getTimeSlots, resetSeats } from '../../utils/api';
import { useAdmin } from '../../utils/auth';
import { toast } from 'react-toastify';
import { FaUsers, FaCalendarAlt, FaChair, FaUndo, FaDownload } from 'react-icons/fa';
import { isAuthenticated, getCurrentUser } from '../../utils/auth';

// AdminNav 컴포넌트를 클라이언트 사이드에서만 렌더링
const AdminNav = dynamic(() => import('../../components/AdminNav'), {
  ssr: false
});

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSeats: 0,
    assignedSeats: 0,
    confirmedSeats: 0,
    totalUsers: 0,
    totalTimeSlots: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  
  // Use admin hook to protect this page
  const isAdmin = useAdmin();

  useEffect(() => {
    // 권한 확인 및 데이터 로드
    const checkAuthAndLoadData = async () => {
      try {
        // 로그인 확인
        const isAuth = isAuthenticated();
        if (!isAuth) {
          router.push('/login');
          return;
        }

        // 사용자 정보 가져오기
        const user = getCurrentUser();
        
        // 관리자 권한 확인
        if (!user || !user.isAdmin) {
          toast.error('관리자 권한이 필요합니다.');
          router.push('/');
          return;
        }

        // 통계 데이터 로드
        setLoading(true);
        const [usersRes, seatsRes, timeslotsRes] = await Promise.all([
          getUsers().catch(() => ({ data: { data: [] } })),
          getSeats().catch(() => ({ data: { data: [] } })),
          getTimeSlots().catch(() => ({ data: { data: [] } }))
        ]);

        // 데이터가 undefined일 경우 빈 배열로 처리
        const users = Array.isArray(usersRes?.data?.data) ? usersRes.data.data : [];
        const seats = Array.isArray(seatsRes?.data?.data) ? seatsRes.data.data : [];
        const timeslots = Array.isArray(timeslotsRes?.data?.data) ? timeslotsRes.data.data : [];
        
        const assignedSeats = seats.filter(seat => seat.assignedTo);
        const confirmedSeats = assignedSeats.filter(seat => seat.confirmed);
        
        setStats({
          totalSeats: seats.length,
          assignedSeats: assignedSeats.length,
          confirmedSeats: confirmedSeats.length,
          totalUsers: users.length,
          totalTimeSlots: timeslots.length
        });
      } catch (error) {
        console.error('데이터 로드 오류:', error);
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, []);

  const handleResetSeats = async () => {
    // 서버 사이드 렌더링 중에는 실행하지 않음
    if (typeof window === 'undefined') return;
    
    const confirm = window.confirm('정말로 모든 좌석 배정을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    
    if (confirm) {
      try {
        setActionLoading(true);
        await resetSeats();
        toast.success('모든 좌석 배정이 초기화되었습니다.');
        loadData();
      } catch (error) {
        console.error('Error resetting seats:', error);
        toast.error('좌석 초기화 중 오류가 발생했습니다.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleExportData = () => {
    if (typeof window === 'undefined') return;
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/admin/seats/export`, '_blank');
  };

  if (!isAdmin) {
    return null; // The useAdmin hook will redirect to home
  }

  return (
    <Layout title="관리자 대시보드 - 연구실 자리 배정 시스템">
      <AdminNav />
      
      <div className="min-h-screen bg-gray-100 md:ml-64">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-primary mb-8">관리자 대시보드</h1>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <h2 className="text-gray-500 text-lg font-semibold mb-2">총 사용자</h2>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <h2 className="text-gray-500 text-lg font-semibold mb-2">총 좌석</h2>
                  <p className="text-3xl font-bold">{stats.totalSeats}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                  <h2 className="text-gray-500 text-lg font-semibold mb-2">배정 일정</h2>
                  <p className="text-3xl font-bold">{stats.totalTimeSlots}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Link href="/admin/seats">
                  <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
                    <h3 className="text-lg font-bold text-primary mb-2">좌석 관리</h3>
                    <p className="text-sm text-gray-600">좌석 정보 보기 및 관리</p>
                  </div>
                </Link>
                
                <Link href="/admin/users">
                  <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
                    <h3 className="text-lg font-bold text-primary mb-2">사용자 관리</h3>
                    <p className="text-sm text-gray-600">사용자 정보 보기 및 관리</p>
                  </div>
                </Link>
                
                <Link href="/admin/timeslots">
                  <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
                    <h3 className="text-lg font-bold text-primary mb-2">신청 일정 관리</h3>
                    <p className="text-sm text-gray-600">신청 일정 설정 및 관리</p>
                  </div>
                </Link>
                
                <Link href="/">
                  <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
                    <h3 className="text-lg font-bold text-primary mb-2">메인 페이지</h3>
                    <p className="text-sm text-gray-600">사용자 화면 보기</p>
                  </div>
                </Link>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-primary mb-4">빠른 작업</h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    onClick={handleResetSeats}
                    disabled={actionLoading}
                    className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <FaUndo className="mr-2" />
                    {actionLoading ? '처리중...' : '모든 좌석 초기화'}
                  </button>
                  
                  <button
                    onClick={handleExportData}
                    className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <FaDownload className="mr-2" />
                    엑셀로 내보내기
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
} 