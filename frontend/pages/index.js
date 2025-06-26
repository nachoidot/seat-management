import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { getSeats, getTimeSlots } from '../utils/api';
import { useAuth, getCurrentUser } from '../utils/auth';
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
      
      // API 응답 구조 확인 및 데이터 추출
      const timeSlotData = timeSlotsResponse.success ? timeSlotsResponse.data : [];
      
      // 모든 시간 슬롯에 우선순위별 시간 정보 추가
      const enhancedTimeSlots = (timeSlotData || []).map(slot => {
        // 각 우선순위별 시간 계산
        const priorityTimes = {};
        for (let priority = 1; priority <= 12; priority++) {
          const baseDate = new Date(slot.baseDate);
          priorityTimes[priority] = {
            openTime: calculateStartTimeByPriority(baseDate, priority),
            closeTime: calculateEndTimeByPriority(baseDate, priority),
            commonAccessTime: calculateCommonAccessTime(baseDate)
          };
        }
        
        return {
          ...slot,
          priorityTimes
        };
      });

      setTimeSlots(enhancedTimeSlots);
      
      // 사용자의 접근 가능 시간 설정
      if (enhancedTimeSlots.length > 0) {
        // 가장 최근 활성화된 일정 찾기
        const activeSlots = enhancedTimeSlots.filter(slot => slot.active);
        if (activeSlots.length > 0) {
          const latestSlot = activeSlots.reduce((latest, current) => {
            return new Date(current.baseDate) > new Date(latest.baseDate) ? current : latest;
          }, activeSlots[0]);
          
          // 사용자 우선순위에 해당하는 접근 가능 시간 구간들 계산
          const userPriority = currentUser.priority || 3; // 기본값 3으로 설정
          const accessTimeSlots = getUserAccessTimeSlots(
            new Date(latestSlot.baseDate), 
            userPriority, 
            new Date(latestSlot.endDate)
          );
          
          if (accessTimeSlots.length > 0) {
            setUserTimeSlot({
              ...latestSlot,
              accessTimeSlots
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
    
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    return canUserAccessSeats(
      new Date(userTimeSlot.baseDate),
      currentUser.priority || 3,
      new Date(userTimeSlot.endDate)
    );
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
                    {timeSlots.length > 0 ? (() => {
                      // 가장 최근 활성화된 일정 찾기
                      const activeSlots = timeSlots.filter(slot => slot && slot.active);
                      const displaySlot = activeSlots.length > 0 
                        ? activeSlots.reduce((latest, current) => {
                            return new Date(current.baseDate) > new Date(latest.baseDate) ? current : latest;
                          }, activeSlots[0])
                        : timeSlots[0]; // 활성화된 슬롯이 없으면 첫 번째 슬롯 표시
                      
                      if (!displaySlot) return null;
                      
                      const currentUser = getCurrentUser();
                      const isAdmin = currentUser && currentUser.isAdmin;
                      
                      if (isAdmin) {
                        // 관리자: 모든 우선순위 표시 (1~12)
                        return Array.from({ length: 12 }, (_, index) => {
                          const priority = index + 1;
                          
                          // 해당 우선순위의 접근 가능 시간 구간들 계산
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
                          
                          return (
                            <tr key={`priority-${priority}`} className={isCurrentUserPriority ? 'bg-blue-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {getPriorityLabel(priority)}
                                  {isCurrentUserPriority && (
                                    <span className="ml-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
                                      내 유형
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-md">
                                  {accessTimeText}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatDateForDisplay(displaySlot.baseDate)} ~ {formatDateForDisplay(displaySlot.endDate)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm ${statusClass}`}>{status}</div>
                              </td>
                            </tr>
                          );
                        });
                      } else {
                        // 일반 사용자: 자신의 우선순위만 표시
                        const userPriority = currentUser ? currentUser.priority : 3;
                        
                        // 해당 사용자의 접근 가능 시간 구간들 계산
                        const accessTimeSlots = getUserAccessTimeSlots(
                          new Date(displaySlot.baseDate),
                          userPriority,
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
                      
                      return (
                          <tr key={`user-priority-${userPriority}`} className="bg-blue-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getPriorityLabel(userPriority)}
                                <span className="ml-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
                                내 유형
                              </span>
                            </div>
                          </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-md">
                                {accessTimeText}
                              </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                                {formatDateForDisplay(displaySlot.baseDate)} ~ {formatDateForDisplay(displaySlot.endDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${statusClass}`}>{status}</div>
                          </td>
                        </tr>
                      );
                      }
                    })() : null}
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