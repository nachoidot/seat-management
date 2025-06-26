import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { getSeats, getTimeSlots } from '../utils/api';
import { useAuth, getCurrentUser } from '../utils/auth';
import { toast } from 'react-toastify';
import timeUtils, { calculateStartTimeByPriority, calculateEndTimeByPriority, getPriorityLabel } from '../utils/timeUtils';

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
  const router = useRouter();
  
  // Use auth hook to protect this page
  const isAuthenticated = useAuth();
  
  useEffect(() => {
    const currentUser = getCurrentUser();
    
    if (isAuthenticated) {
      loadData(currentUser);
    }
  }, [isAuthenticated]);

  const loadData = async (currentUser) => {
    try {
      setLoading(true);
      
      // Fetch seats data
      const seatsResponse = await getSeats();
      setSeats(seatsResponse.data);
      
      // Fetch time slots
      const timeSlotsResponse = await getTimeSlots();
      
      // 모든 시간 슬롯에 우선순위별 시간 정보 추가
      const enhancedTimeSlots = (timeSlotsResponse.data.data || []).map(slot => {
        // 각 우선순위별 시간 계산
        const priorityTimes = {};
        for (let priority = 1; priority <= 12; priority++) {
          const baseDate = new Date(slot.baseDate);
          priorityTimes[priority] = {
            openTime: calculateStartTimeByPriority(baseDate, priority),
            closeTime: calculateEndTimeByPriority(baseDate, priority)
          };
        }
        
        return {
          ...slot,
          priorityTimes
        };
      });

      setTimeSlots(enhancedTimeSlots);
      
      // 현재 사용자의 우선순위에 해당하는 시간 슬롯 찾기
      if (currentUser && enhancedTimeSlots.length > 0) {
        // 가장 최근 활성화된 일정 찾기
        const activeSlots = enhancedTimeSlots.filter(slot => slot.active);
        if (activeSlots.length > 0) {
          const latestSlot = activeSlots.reduce((latest, current) => {
            return new Date(current.baseDate) > new Date(latest.baseDate) ? current : latest;
          }, activeSlots[0]);
          
          // 사용자 우선순위에 해당하는 시간 계산
          const userPriority = currentUser.priority || 3; // 기본값 3으로 설정
          if (latestSlot.priorityTimes && latestSlot.priorityTimes[userPriority]) {
            setUserTimeSlot({
              ...latestSlot,
              openTime: latestSlot.priorityTimes[userPriority].openTime,
              closeTime: latestSlot.priorityTimes[userPriority].closeTime
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
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
  };

  const canUserRegister = () => {
    if (!userTimeSlot || typeof window === 'undefined') return false;
    
    const now = new Date();
    const openTime = new Date(userTimeSlot.openTime);
    const closeTime = new Date(userTimeSlot.closeTime);
    
    return now >= openTime && now <= closeTime;
  };

  if (!isAuthenticated) {
    return null; // The useAuth hook will redirect to login
  }

  const isClient = typeof window !== 'undefined';

  return (
    <Layout title="연구실 자리 배정 시스템">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">연구실 자리 배정</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-primary mb-4">배정 일정</h2>
          
          {loading ? (
            <p>로딩 중...</p>
          ) : timeSlots && timeSlots.length > 0 ? (
            <Suspense fallback={<LoadingFallback />}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-secondary">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        유형
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        신청 시작
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        신청 마감
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
                    {timeSlots.map((slot) => {
                      if (!slot) return null;
                      
                      const currentUser = getCurrentUser();
                      const userPriority = currentUser ? currentUser.priority : 3;
                      
                      // 해당 사용자의 우선순위에 맞는 시간 계산
                      const userOpenTime = slot.priorityTimes && 
                                         slot.priorityTimes[userPriority] ? 
                                         slot.priorityTimes[userPriority].openTime : null;
                                         
                      const userCloseTime = slot.priorityTimes && 
                                          slot.priorityTimes[userPriority] ? 
                                          slot.priorityTimes[userPriority].closeTime : null;
                      
                      const now = new Date();
                      const openTime = userOpenTime ? new Date(userOpenTime) : null;
                      const closeTime = userCloseTime ? new Date(userCloseTime) : null;
                      
                      let status = '';
                      let statusClass = '';
                      
                      if (!openTime || !closeTime) {
                        status = '준비 중';
                        statusClass = 'text-gray-500';
                      } else if (now < openTime) {
                        status = '대기 중';
                        statusClass = 'text-gray-500';
                      } else if (now >= openTime && now <= closeTime) {
                        status = '신청 가능';
                        statusClass = 'text-green-600 font-bold';
                      } else {
                        status = '마감됨';
                        statusClass = 'text-red-500';
                      }
                      
                      return (
                        <tr key={slot._id || `slot-${userPriority}`} className={userPriority === parseInt(userPriority) ? 'bg-gray-light' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getPriorityLabel(userPriority)}
                              <span className="ml-2 text-xs bg-white text-cardinal px-3 py-1 rounded-full font-bold border-2 border-cardinal">
                                내 유형
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDateTime(userOpenTime)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDateTime(userCloseTime)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDateForDisplay(slot.baseDate)} ~ {formatDateForDisplay(slot.endDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${statusClass}`}>{status}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-600">
                <p className="font-bold mb-1">신청 가능 시간:</p>
                <ul className="list-disc pl-5 grid grid-cols-1 md:grid-cols-2 gap-1">
                  {Object.keys(timeUtils.PRIORITY_LABELS).map(priority => (
                    <li key={`priority-info-${priority}`}>
                      <strong>{timeUtils.PRIORITY_LABELS[priority]} ({priority}유형):</strong> {formatTime(calculateStartTimeByPriority(new Date(), priority))}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-red-500">* 각 시간은 30분간 신청 가능하며, 해당 시간에 신청하지 못한 경우 오후 3시 이후 신청 가능합니다.</p>
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
                {canUserRegister() ? (
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
            <SeatGrid seats={seats} onSeatUpdate={() => loadData(getCurrentUser())} />
          ) : (
            <p className="text-gray-500">등록된 좌석이 없습니다.</p>
          )}
        </div>
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