import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import AdminNav from '../../components/AdminNav';
import { getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } from '../../utils/api';
import { useAdmin } from '../../utils/auth';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaEdit, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';
import { ClientOnly } from '../../utils/client-only';
import timeUtils, { 
  getPriorityLabel, 
  formatTime, 
  calculateStartTimeByPriority,
  calculateEndTimeByPriority,
  calculateCommonAccessTime,
  getUserAccessTimeSlots
} from '../../utils/timeUtils';

export default function AdminTimeSlots() {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [newTimeSlotData, setNewTimeSlotData] = useState({
    title: '',
    description: '',
    baseDate: '',
    endDate: '',
    active: true
  });
  const [showPriorityInfoModal, setShowPriorityInfoModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  
  // 관리자 권한 확인
  const isAdmin = useAdmin();

  useEffect(() => {
    if (isAdmin) {
      loadTimeSlots();
    }
  }, [isAdmin]);

  // 권한이 없거나 로딩 중인 경우
  if (isAdmin === null) {
    return (
      <Layout title="일정 관리 - 연구실 자리 배정 시스템">
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">인증 확인 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isAdmin === false) {
    return null; // useAdmin 훅이 자동으로 리다이렉트
  }

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      
      const response = await getTimeSlots();
      
      // API 응답 구조에 따른 데이터 추출
      let timeSlotsData = [];
      if (response && response.success && response.data) {
        // 응답 구조 1: {success, count, data}
        timeSlotsData = response.data;
      } else if (response && response.data && Array.isArray(response.data)) {
        // 응답 구조 2: {data: Array}
        timeSlotsData = response.data;
      } else if (response && Array.isArray(response)) {
        // 응답 구조 3: 직접 배열
        timeSlotsData = response;
      } else {
        console.warn('지원되지 않는 응답 구조:', response);
        timeSlotsData = [];
      }

      setTimeSlots(timeSlotsData);
    } catch (error) {
      console.error('일정 로드 오류:', error);
      toast.error('일정 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 날짜를 YYYY-MM-DD 형식으로 변환
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // 표시용 날짜 형식
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewTimeSlotData({
      ...newTimeSlotData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddTimeSlot = async (e) => {
    e.preventDefault();
    
    if (!newTimeSlotData.name || !newTimeSlotData.baseDate || !newTimeSlotData.endDate) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // 날짜 변환
      const baseDateLocal = new Date(newTimeSlotData.baseDate);
      const endDateLocal = new Date(newTimeSlotData.endDate);
      
      const timeSlotData = {
        name: newTimeSlotData.name.trim(),
        baseDate: baseDateLocal.toISOString(),
        endDate: endDateLocal.toISOString(),
        active: newTimeSlotData.active
      };

      const result = await createTimeSlot(timeSlotData);
      
      if (result.success) {
        toast.success('일정이 추가되었습니다.');
        setShowAddModal(false);
        setNewTimeSlotData({
          name: '',
          baseDate: '',
          endDate: '',
          active: true
        });
        await loadTimeSlots();
      } else {
        toast.error(result.message || '일정 추가 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('일정 추가 오류 상세:', error);
      console.error('에러 응답:', error.response);
      
      const errorMessage = error.response?.data?.message || error.message || '일정 추가 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTimeSlot = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setNewTimeSlotData({
      title: timeSlot.title,
      description: timeSlot.description || '',
      baseDate: formatDateForInput(timeSlot.baseDate),
      endDate: formatDateForInput(timeSlot.endDate),
      active: timeSlot.active
    });
    setShowEditModal(true);
  };

  const handleUpdateTimeSlot = async (e) => {
    e.preventDefault();
    console.log('일정 수정 시작:', newTimeSlotData);
    
    if (!newTimeSlotData.title || !newTimeSlotData.baseDate || !newTimeSlotData.endDate) {
      toast.error('제목, 배정일, 종료일을 모두 입력해주세요.');
      return;
    }

    if (new Date(newTimeSlotData.baseDate) >= new Date(newTimeSlotData.endDate)) {
      toast.error('종료일은 배정일보다 이후여야 합니다.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('일정 수정 API 호출 전:', newTimeSlotData);
      
      // 날짜 형식이 문제일 수 있으므로 ISO 문자열로 변환
      const baseDate = new Date(newTimeSlotData.baseDate);
      const endDate = new Date(newTimeSlotData.endDate);
      
      console.log('변환된 날짜:', {
        baseDate,
        endDate,
        baseDateString: baseDate.toISOString(),
        endDateString: endDate.toISOString(),
      });
      
      const timeSlotData = {
        title: newTimeSlotData.title,
        description: newTimeSlotData.description || '',
        baseDate: baseDate.toISOString(),  // ISO 형식으로 변환
        endDate: endDate.toISOString(),    // ISO 형식으로 변환
        active: newTimeSlotData.active
      };
      
      console.log('API 호출 데이터:', timeSlotData);
      const result = await updateTimeSlot(selectedTimeSlot._id, timeSlotData);
      console.log('일정 수정 결과:', result);
      
      toast.success('일정이 업데이트되었습니다.');
      setShowEditModal(false);
      console.log('일정 목록 다시 로드');
      await loadTimeSlots();
    } catch (error) {
      console.error('일정 업데이트 오류 상세:', error);
      console.error('에러 응답:', error.response);
      toast.error(error.response?.data?.message || '일정 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      console.log('일정 수정 처리 완료');
    }
  };

  const handleDeleteClick = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowDeleteModal(true);
  };

  const handleDeleteTimeSlot = async () => {
    try {
      setIsSubmitting(true);
      await deleteTimeSlot(selectedTimeSlot._id);
      
      toast.success('일정이 삭제되었습니다.');
      setShowDeleteModal(false);
      await loadTimeSlots();
    } catch (error) {
      console.error('일정 삭제 오류:', error);
      toast.error(error.response?.data?.message || '일정 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 유형별 시간 정보 요약
  const getPriorityTimeInfo = () => {
    return Object.keys(timeUtils.PRIORITY_LABELS).map(priority => {
      const priorityNum = parseInt(priority);
      const { hour, minute } = timeUtils.PRIORITY_TIMES[priorityNum];
      
      let description = '';
      if (priorityNum === 1 || priorityNum === 12) {
        description = '15:00부터 배정 일정 종료까지';
      } else {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 30;
        const endHour = hour + Math.floor(endMinute / 60);
        const endMinuteFinal = endMinute % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinuteFinal.toString().padStart(2, '0')}`;
        description = `${startTime}~${endTime} + 15:00 이후`;
      }
      
      return {
        priority: priorityNum,
        label: timeUtils.PRIORITY_LABELS[priorityNum],
        description
      };
    }).sort((a, b) => a.priority - b.priority);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getAccessTimeDisplay = (timeSlot) => {
    if (!timeSlot || !timeSlot.baseDate || !timeSlot.endDate) return '시간 미정';
    
    const baseDate = new Date(timeSlot.baseDate);
    const endDate = new Date(timeSlot.endDate);
    
    // 모든 우선순위의 접근 시간 구간들을 계산
    const allAccessTimes = [];
    
    for (let priority = 1; priority <= 12; priority++) {
      const accessSlots = getUserAccessTimeSlots(baseDate, priority, endDate);
      if (accessSlots.length > 0) {
        const priorityLabel = getPriorityLabel(priority);
        const timeRanges = accessSlots.map(slot => {
          const startTime = formatDateTime(slot.start);
          const endTime = formatDateTime(slot.end);
          const typeLabel = slot.type === 'own' ? '자신의 시간' : '15:00 이후';
          return `${startTime}~${endTime} (${typeLabel})`;
        }).join(', ');
        
        allAccessTimes.push(`${priorityLabel}: ${timeRanges}`);
      }
    }
    
    return allAccessTimes.length > 0 ? allAccessTimes.join('; ') : '시간 미정';
  };

  return (
    <Layout title="일정 관리 - 연구실 자리 배정 시스템">
      <ClientOnly>
        <AdminNav />
      </ClientOnly>
      
      <div className="min-h-screen bg-gray-100 md:ml-64">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary">일정 관리</h1>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowPriorityInfoModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center"
              >
                <FaInfoCircle className="mr-2" /> 유형 정보
              </button>
              
              <button 
                onClick={() => {
                  setNewTimeSlotData({
                    title: '',
                    description: '',
                    baseDate: '',
                    endDate: '',
                    active: true
                  });
                  setShowAddModal(true);
                }}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
              >
                <FaPlus className="mr-2" /> 일정 추가
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center text-blue-600">
              <FaInfoCircle className="mr-2" />
              <p>각 좌석 배정 일정의 날짜를 관리합니다. 유형별 배정 시간은 시스템에 의해 자동으로 계산됩니다.</p>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : (
            <>
              {console.log('타임슬롯 렌더링 상태:', { 타임슬롯개수: timeSlots.length, 타임슬롯: timeSlots })}
              {timeSlots.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 text-lg mb-4">등록된 일정이 없습니다</p>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    일정 추가하기
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">배정일</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종료일</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timeSlots.map((timeSlot) => (
                          <tr key={timeSlot._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center">
                                <FaCalendarAlt className="text-primary mr-2" />
                                {timeSlot.title}
                              </div>
                              {timeSlot.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {timeSlot.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateForDisplay(timeSlot.baseDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateForDisplay(timeSlot.endDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${timeSlot.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {timeSlot.active ? '활성화' : '비활성화'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleEditTimeSlot(timeSlot)}
                                  className="text-indigo-600 hover:text-indigo-900" 
                                  title="수정"
                                >
                                  <FaEdit />
                                </button>
                                <button 
                                  onClick={() => handleDeleteClick(timeSlot)}
                                  className="text-red-600 hover:text-red-900" 
                                  title="삭제"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">일정 추가</h2>
            
            <form onSubmit={handleAddTimeSlot}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
                  제목
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newTimeSlotData.title}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="일정 제목을 입력하세요"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                  설명 (선택사항)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newTimeSlotData.description}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="일정에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="baseDate" className="block text-gray-700 text-sm font-bold mb-2">
                  배정일
                </label>
                <input
                  type="date"
                  id="baseDate"
                  name="baseDate"
                  value={newTimeSlotData.baseDate}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  유형별 시간은 자동으로 계산됩니다.
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">
                  종료일
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={newTimeSlotData.endDate}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-6 flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={newTimeSlotData.active}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label htmlFor="active" className="text-gray-700 text-sm font-bold">
                  활성화
                </label>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일정 수정 모달 */}
      {showEditModal && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">일정 수정</h2>
            
            <form onSubmit={handleUpdateTimeSlot}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
                  제목
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newTimeSlotData.title}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="일정 제목을 입력하세요"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                  설명 (선택사항)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newTimeSlotData.description}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="일정에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="baseDate" className="block text-gray-700 text-sm font-bold mb-2">
                  배정일
                </label>
                <input
                  type="date"
                  id="baseDate"
                  name="baseDate"
                  value={newTimeSlotData.baseDate}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  유형별 시간은 자동으로 계산됩니다.
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">
                  종료일
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={newTimeSlotData.endDate}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-6 flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={newTimeSlotData.active}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label htmlFor="active" className="text-gray-700 text-sm font-bold">
                  활성화
                </label>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일정 삭제 확인 모달 */}
      {showDeleteModal && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-600">일정 삭제</h2>
            <p className="mb-6 text-gray-700">
              <strong>{selectedTimeSlot.title}</strong> 일정을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteTimeSlot}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 유형 정보 모달 */}
      {showPriorityInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">유형별 배정 시간</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">배정 시간</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPriorityTimeInfo().map(info => (
                    <tr key={`priority-${info.priority}`} className="hover:bg-gray-50">
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{info.priority}유형</div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{info.label}</div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{info.description}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
              <p className="font-bold mb-1">안내:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>각 유형 그룹은 지정된 시간으로부터 30분 동안 신청할 수 있습니다.</li>
                <li>중복 신청한 경우 자리 배정시 불이익이 있을 수 있습니다.</li>
                <li>지정된 시간에 신청하지 못한 경우 오후 3시 이후에 신청 가능합니다.</li>
              </ul>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowPriorityInfoModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 