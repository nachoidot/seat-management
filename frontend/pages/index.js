import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { getSeats, getTimeSlots, changePassword } from '../utils/api';
import { useAuthStatus } from '../utils/auth';
import { toast } from 'react-toastify';
import timeUtils, { 
  calculateStartTimeByPriority, 
  calculateEndTimeByPriority, 
  calculateCommonAccessTime,
  canUserAccessSeats,
  getUserAccessTimeSlots,
  getPriorityLabel 
} from '../utils/timeUtils';

// 클라이언트 사이드에서만 렌더링되도록 SeatGrid를 dynamic import
const SeatGrid = dynamic(() => import('../components/SeatGrid'), {
  ssr: false,
  loading: () => <div className="text-center py-8">좌석 정보를 불러오는 중...</div>
});

// 로딩 상태 표시를 위한 컴포넌트
const LoadingFallback = () => <div className="text-center py-4">로딩 중...</div>;

export default function Home() {
  const [seats, setSeats] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTimeSlot, setUserTimeSlot] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const router = useRouter();
  
  // Use auth hook to protect this page and get user data
  const { user: currentUser, loading: authLoading, authenticated } = useAuthStatus();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.push('/login');
    }
  }, [authLoading, authenticated, router]);

  // loadData 함수를 useCallback으로 메모이제이션
  const loadData = useCallback(async (user = currentUser) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // API 호출을 병렬로 실행
      const [seatsResponse, timeSlotsResponse] = await Promise.all([
        getSeats(),
        getTimeSlots()
      ]);
      
      setSeats(seatsResponse.data);
      
      // API 응답 구조 확인 및 데이터 추출
      const timeSlotData = timeSlotsResponse.success ? timeSlotsResponse.data : [];
      
      // 시간 슬롯 처리를 단순화
      setTimeSlots(timeSlotData || []);
      
      // 사용자의 접근 가능 시간 설정 (활성화된 슬롯만)
      if (timeSlotData && timeSlotData.length > 0) {
        const activeSlots = timeSlotData.filter(slot => slot.active);
        if (activeSlots.length > 0) {
          const latestSlot = activeSlots.reduce((latest, current) => {
            return new Date(current.baseDate) > new Date(latest.baseDate) ? current : latest;
          }, activeSlots[0]);
          
          setUserTimeSlot(latestSlot);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (authenticated && currentUser) {
      loadData(currentUser);
    }
  }, [authenticated, currentUser, loadData]);

  // 시간 포맷팅 함수를 메모이제이션
  const formatDateTime = useCallback((dateString) => {
    if (typeof window === 'undefined' || !dateString) return '';
    
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    };
    return new Intl.DateTimeFormat('ko-KR', options).format(date);
  }, []);

  // 사용자 등록 가능 여부를 메모이제이션
  const canUserRegister = useMemo(() => {
    if (!userTimeSlot || typeof window === 'undefined' || !currentUser) return false;
    
    return canUserAccessSeats(
      new Date(userTimeSlot.baseDate),
      currentUser.priority || 3,
      new Date(userTimeSlot.endDate)
    );
  }, [userTimeSlot, currentUser]);

  // 표시할 타임슬롯과 우선순위 정보를 메모이제이션
  const displayData = useMemo(() => {
    if (!timeSlots || timeSlots.length === 0 || !currentUser) return null;
    
    const activeSlots = timeSlots.filter(slot => slot && slot.active);
    const displaySlot = activeSlots.length > 0 
      ? activeSlots.reduce((latest, current) => {
          return new Date(current.baseDate) > new Date(latest.baseDate) ? current : latest;
        }, activeSlots[0])
      : timeSlots[0];
    
    if (!displaySlot) return null;
    
    const isAdmin = currentUser && currentUser.isAdmin;
    const userPriority = currentUser.priority || 3;
    
    // 관리자인 경우 모든 우선순위, 일반 사용자인 경우 자신의 우선순위만
    const prioritiesToShow = isAdmin ? Array.from({ length: 12 }, (_, i) => i + 1) : [userPriority];
    
    const rows = prioritiesToShow.map(priority => {
      // 접근 가능 시간 구간들 계산
      const accessTimeSlots = getUserAccessTimeSlots(
        new Date(displaySlot.baseDate),
        priority,
        new Date(displaySlot.endDate)
      );
      
      const now = new Date();
      let status = '';
      let statusClass = '';
      let accessTimeText = '';
      
      if (accessTimeSlots.length === 0) {
        status = '준비 중';
        statusClass = 'text-gray-500';
        accessTimeText = '시간 미정';
      } else {
        // 현재 접근 가능한지 확인
        const canAccess = accessTimeSlots.some(slot => 
          now >= slot.start && now <= slot.end
        );
        
        if (canAccess) {
          status = '신청 가능';
          statusClass = 'text-green-600 font-bold';
        } else {
          // 다음 접근 시간 확인
          const nextSlot = accessTimeSlots.find(slot => now < slot.start);
          if (nextSlot) {
            status = '대기 중';
            statusClass = 'text-orange-500';
          } else {
            status = '마감됨';
            statusClass = 'text-red-500';
          }
        }
        
        // 접근 가능 시간 텍스트 생성
        accessTimeText = accessTimeSlots.map(slot => {
          const startTime = formatDateTime(slot.start);
          const endTime = formatDateTime(slot.end);
          const typeLabel = slot.type === 'own' ? '자신의 시간' : '15:00 이후';
          return `${startTime}~${endTime} (${typeLabel})`;
        }).join(', ');
      }
      
      const isCurrentUserPriority = currentUser.priority === priority;
      
      return {
        priority,
        accessTimeText,
        status,
        statusClass,
        isCurrentUserPriority,
        displaySlot
      };
    });
    
    return { displaySlot, rows };
  }, [timeSlots, currentUser, formatDateTime]);

  // 비밀번호 변경 함수
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setPasswordLoading(true);
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  if (!authenticated) {
    return null; // The useAuthStatus hook will redirect to login
  }

  const isClient = typeof window !== 'undefined';

  return (
    <Layout title="연구실 자리 배정 시스템">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">연구실 자리 배정</h1>
          <div className="flex items-center space-x-4">
            {currentUser && (
              <>
                <span className="text-sm text-gray-600">
                  환영합니다, {currentUser.name}님
                </span>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  비밀번호 변경
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-primary mb-4">배정 일정</h2>
          
          {loading ? (
            <p>로딩 중...</p>
          ) : displayData ? (
            <Suspense fallback={<LoadingFallback />}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-secondary">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        유형
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        신청 가능 시간
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        배정 기간
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayData.rows.map(row => (
                      <tr key={`priority-${row.priority}`} className={row.isCurrentUserPriority ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getPriorityLabel(row.priority)}
                            {row.isCurrentUserPriority && (
                              <span className="ml-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
                                내 유형
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            {row.accessTimeText}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDateForDisplay(row.displaySlot.baseDate)} ~ {formatDateForDisplay(row.displaySlot.endDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${row.statusClass}`}>{row.status}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-600">
                <p className="font-bold mb-1">신청 규칙:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>1순위(수료생) & 12순위(기타):</strong> 15:00부터 배정 일정 종료까지 신청 가능</li>
                  <li><strong>2~11순위:</strong> 자신의 배정시간(30분) + 15:00 이후 신청 가능</li>
                  <li><strong>관리자:</strong> 언제든지 신청 가능</li>
                </ul>
                <p className="mt-2 text-xs text-red-500">* 각 우선순위별 배정시간은 30분간이며, 15:00 이후에는 모든 우선순위가 추가 신청 가능합니다.</p>
              </div>
            </Suspense>
          ) : (
            <p className="text-gray-500">신청 일정이 없습니다.</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">좌석 배치도</h2>
            {isClient && userTimeSlot && (
              <div className="text-sm">
                {canUserRegister ? (
                  <span className="text-green-600 font-bold">현재 신청 가능합니다</span>
                ) : (
                  <span className="text-red-500">신청 기간이 아닙니다</span>
                )}
              </div>
            )}
          </div>
          
          {loading ? (
            <p>로딩 중...</p>
          ) : seats && seats.length > 0 ? (
            <SeatGrid seats={seats} onSeatUpdate={() => loadData(currentUser)} />
          ) : (
            <p className="text-gray-500">등록된 좌석이 없습니다.</p>
          )}
        </div>

        {/* 비밀번호 변경 모달 */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">비밀번호 변경</h3>
              
              <form onSubmit={handlePasswordChange}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      현재 비밀번호
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      새 비밀번호
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      최소 6자 이상 입력해주세요.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      새 비밀번호 확인
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={passwordLoading}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? '변경 중...' : '변경하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// 날짜 포맷팅 함수
const formatDateForDisplay = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

// 시간 포맷팅 함수
const formatTime = (date) => {
  if (!date) return '';
  
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}; 