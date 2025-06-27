import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';
import { getSeats, getUsers, getTimeSlots, resetSeats } from '../../utils/api';
import { useAdmin } from '../../utils/auth';
import { toast } from 'react-toastify';
import { FaUsers, FaCalendarAlt, FaChair, FaUndo, FaDownload, FaCheckCircle, FaTimesCircle, FaDoorOpen } from 'react-icons/fa';

// AdminNav 컴포넌트를 클라이언트 사이드에서만 렌더링
const AdminNav = dynamic(() => import('../../components/AdminNav'), {
  ssr: false
});

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSeats: 0,
    assignedSeats: 0,
    confirmedSeats: 0,
    availableSeats: 0,
    totalUsers: 0,
    totalTimeSlots: 0,
    seatsByType: { 석사: 0, 박사: 0 },
    seatsByRoom: {},
    assignmentRate: 0,
    confirmationRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  
  // Use admin hook to protect this page
  const isAdmin = useAdmin();

  // 데이터 로드 함수
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 각 API 병렬 호출
      const [usersRes, seatsRes, timeslotsRes] = await Promise.allSettled([
        getUsers().catch(err => {
          console.error('사용자 데이터 로드 실패:', err);
          return { data: [] };
        }),
        getSeats().catch(err => {
          console.error('좌석 데이터 로드 실패:', err);
          return { data: [] };
        }),
        getTimeSlots().catch(err => {
          console.error('일정 데이터 로드 실패:', err);
          return { data: [] };
        })
      ]);

      // 각 API 응답에서 데이터 추출
      let users = [];
      let seats = [];
      let timeslots = [];

      // 사용자 데이터 처리
      if (usersRes.status === 'fulfilled') {
        try {
          if (usersRes.value && usersRes.value.data) {
            users = usersRes.value.data;
          } else if (usersRes.value && Array.isArray(usersRes.value)) {
            users = usersRes.value;
          }
        } catch (err) {
          console.warn('사용자 데이터에 접근할 수 없습니다 (권한 문제)');
          users = [];
        }
      }

      // 좌석 데이터 처리  
      if (seatsRes.status === 'fulfilled') {
        if (seatsRes.value && seatsRes.value.data) {
          seats = seatsRes.value.data;
        } else if (seatsRes.value && Array.isArray(seatsRes.value)) {
          seats = seatsRes.value;
        }
      }

      // 일정 데이터 처리
      if (timeslotsRes.status === 'fulfilled') {
        if (timeslotsRes.value && timeslotsRes.value.data) {
          timeslots = timeslotsRes.value.data;
        } else if (timeslotsRes.value && Array.isArray(timeslotsRes.value)) {
          timeslots = timeslotsRes.value;
        }
      }

      // 데이터 검증 및 기본값 설정
      const validUsers = Array.isArray(users) ? users : [];
      const validSeats = Array.isArray(seats) ? seats : [];
      const validTimeslots = Array.isArray(timeslots) ? timeslots : [];

      // 상태 업데이트
      setStats({
        totalSeats: validSeats.length,
        assignedSeats: validSeats.filter(seat => seat.assignedTo).length,
        confirmedSeats: validSeats.filter(seat => seat.confirmed).length,
        availableSeats: validSeats.filter(seat => !seat.assignedTo).length,
        totalUsers: validUsers.length,
        totalTimeSlots: validTimeslots.length,
        seatsByType: validSeats.reduce((acc, seat) => {
          const type = seat.type || '미분류';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        seatsByRoom: validSeats.reduce((acc, seat) => {
          const room = seat.roomNumber || '미분류';
          acc[room] = (acc[room] || 0) + 1;
          return acc;
        }, {}),
        assignmentRate: validSeats.length > 0 ? Math.round((validSeats.filter(seat => seat.assignedTo).length / validSeats.length) * 100) : 0,
        confirmationRate: validSeats.length > 0 ? Math.round((validSeats.filter(seat => seat.confirmed).length / validSeats.length) * 100) : 0
      });

    } catch (error) {
      console.error('데이터 로드 오류:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

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
              {/* 주요 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <div className="flex items-center">
                    <FaUsers className="text-blue-500 text-2xl mr-3" />
                    <div>
                      <h2 className="text-gray-500 text-sm font-semibold mb-1">총 사용자</h2>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      {stats.totalUsers === 0 && (
                        <p className="text-xs text-red-400">권한 확인 필요</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <div className="flex items-center">
                    <FaChair className="text-green-500 text-2xl mr-3" />
                    <div>
                      <h2 className="text-gray-500 text-sm font-semibold mb-1">총 좌석</h2>
                      <p className="text-2xl font-bold">{stats.totalSeats}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center">
                    <FaCheckCircle className="text-yellow-500 text-2xl mr-3" />
                    <div>
                      <h2 className="text-gray-500 text-sm font-semibold mb-1">배정된 좌석</h2>
                      <p className="text-2xl font-bold">{stats.assignedSeats}</p>
                      <p className="text-xs text-gray-400">
                        {stats.assignmentRate}% 배정률
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                  <div className="flex items-center">
                    <FaCheckCircle className="text-red-500 text-2xl mr-3" />
                    <div>
                      <h2 className="text-gray-500 text-sm font-semibold mb-1">확정된 좌석</h2>
                      <p className="text-2xl font-bold">{stats.confirmedSeats}</p>
                      <p className="text-xs text-gray-400">
                        {stats.confirmationRate}% 확정률
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-purple-500 text-2xl mr-3" />
                    <div>
                      <h2 className="text-gray-500 text-sm font-semibold mb-1">배정 일정</h2>
                      <p className="text-2xl font-bold">{stats.totalTimeSlots}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 세부 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* 좌석 유형별 통계 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">좌석 유형별 현황</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">석사과정 좌석</span>
                      <span className="font-bold text-blue-600">{stats.seatsByType.석사}개</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">박사과정 좌석</span>
                      <span className="font-bold text-purple-600">{stats.seatsByType.박사}개</span>
                    </div>
                  </div>
                </div>

                {/* 가용 좌석 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">좌석 배정 현황</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">사용 가능 좌석</span>
                      <span className="font-bold text-green-600">{stats.availableSeats}개</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">배정 대기</span>
                      <span className="font-bold text-orange-600">{stats.assignedSeats - stats.confirmedSeats}개</span>
                    </div>
                  </div>
                </div>

                {/* 방별 통계 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">방별 배정 현황</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {Object.entries(stats.seatsByRoom).map(([room, data]) => (
                      <div key={room} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{room}호</span>
                        <span className="font-semibold">
                          {data.assigned}/{data.total}
                          <span className="text-xs text-gray-400 ml-1">
                            ({data.total > 0 ? Math.round((data.assigned/data.total)*100) : 0}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
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