import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import AdminNav from '../../components/AdminNav';
import SeatGrid from '../../components/SeatGrid';
import { getSeats, createBatchSeats, resetSeats, bulkConfirmSeats, getSeatAssignmentStats, getUsers } from '../../utils/api';
import { useAdmin } from '../../utils/auth';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaEdit, FaUndo, FaCheck, FaCheckCircle, FaClock, FaUsers } from 'react-icons/fa';
import { ClientOnly } from '../../utils/client-only';

export default function AdminSeats() {
  const [activeTab, setActiveTab] = useState('grid'); // grid, assignments, management
  const [seats, setSeats] = useState([]);
  const [allSeatsWithObjects, setAllSeatsWithObjects] = useState([]); // SeatGrid용 (오브젝트 포함)
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newSeatData, setNewSeatData] = useState({
    number: '',
    section: '',
    type: 'regular',
    active: true
  });
  const [batchSeats, setBatchSeats] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  
  // 관리자 권한 확인
  const isAdmin = useAdmin();

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  // 권한이 없거나 로딩 중인 경우
  if (isAdmin === null) {
    return (
      <Layout title="좌석 관리 - 연구실 자리 배정 시스템">
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

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSeats(),
        loadUsers(),
        loadStats()
      ]);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeats = async () => {
    try {
      const response = await getSeats();
      let allSeats = [];
      
      if (response?.data?.data && Array.isArray(response.data.data)) {
        allSeats = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        allSeats = response.data;
      } else if (response?.success === false) {
        console.error('좌석 데이터 접근 실패:', response.message);
        toast.error(response.message || '좌석 데이터에 접근할 수 없습니다.');
        return;
      }
      
      // 실제 좌석만 필터링 (objectType이 있는 오브젝트들은 제외)
      const realSeats = allSeats.filter(seat => !seat.objectType);
      
      // 개발 환경에서 필터링 결과 로깅
      if (process.env.NODE_ENV === 'development') {
        const filteredObjects = allSeats.filter(seat => seat.objectType);
        console.log('좌석 관리 페이지 - 데이터 필터링 결과:', {
          전체_데이터: allSeats.length,
          실제_좌석: realSeats.length,
          필터링된_오브젝트: filteredObjects.length,
          오브젝트_목록: filteredObjects.map(obj => ({ 
            type: obj.objectType, 
            name: obj.objectName, 
            room: obj.roomNumber,
            number: obj.number
          }))
        });
      }
      
      // 실제 좌석만 저장 (테이블 등에 사용)
      setSeats(realSeats);
      // 오브젝트 포함 전체 데이터 저장 (SeatGrid 레이아웃 표시용)
      setAllSeatsWithObjects(allSeats);
    } catch (error) {
      console.error('좌석 로드 오류:', error);
      toast.error('좌석 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('사용자 로드 오류:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getSeatAssignmentStats();
      setStats(response.data);
    } catch (error) {
      console.error('통계 로드 오류:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewSeatData({
      ...newSeatData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleBatchInputChange = (e) => {
    setBatchSeats(e.target.value);
  };

  const handleAddSeat = async (e) => {
    e.preventDefault();
    
    if (!newSeatData.number || !newSeatData.section) {
      toast.error('좌석 번호와 섹션을 입력해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      toast.success('좌석이 추가되었습니다.');
      setShowAddModal(false);
      setNewSeatData({
        number: '',
        section: '',
        type: 'regular',
        active: true
      });
      await loadAllData();
    } catch (error) {
      console.error('좌석 추가 오류:', error);
      toast.error('좌석 추가 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchCreate = async (e) => {
    e.preventDefault();
    
    if (!batchSeats.trim()) {
      toast.error('좌석 정보를 입력해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const rows = batchSeats.trim().split('\n');
      const seatsData = rows.map(row => {
        const [number, section, type = 'regular'] = row.split(',').map(item => item.trim());
        return { number, section, type, active: true };
      });
      
      await createBatchSeats(seatsData);
      
      toast.success('좌석이 일괄 추가되었습니다.');
      setBatchSeats('');
      setShowAddModal(false);
      await loadAllData();
    } catch (error) {
      console.error('좌석 일괄 추가 오류:', error);
      toast.error('좌석 일괄 추가 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSeats = async () => {
    try {
      setIsSubmitting(true);
      await resetSeats();
      toast.success('모든 좌석이 초기화되었습니다.');
      setShowResetModal(false);
      await loadAllData();
    } catch (error) {
      console.error('좌석 초기화 오류:', error);
      toast.error('좌석 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkConfirm = async (type, options = {}) => {
    try {
      setIsSubmitting(true);
      console.log('일괄 확정 시작:', { type, options });
      
      const response = await bulkConfirmSeats(options);
      console.log('일괄 확정 응답:', response);
      
      toast.success(response.message || '좌석이 확정되었습니다.');
      await loadAllData();
    } catch (error) {
      console.error('일괄 확정 오류:', error);
      console.error('오류 응답:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || '일괄 확정 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSeat = (seatId) => {
    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    );
  };

  const getUserBySeatId = (studentId) => {
    return users.find(user => user.studentId === studentId);
  };

  const assignedSeats = seats.filter(seat => seat.assignedTo);
  const pendingSeats = assignedSeats.filter(seat => !seat.confirmed);
  const confirmedSeats = assignedSeats.filter(seat => seat.confirmed);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'grid':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">좌석 배치도</h2>
              <SeatGrid 
                seats={allSeatsWithObjects} 
                onSeatUpdate={loadAllData} 
                isAdmin={true} 
              />
            </div>
          </div>
        );

      case 'assignments':
        return (
          <div className="space-y-6">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaUsers className="text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">총 배정</p>
                      <p className="text-2xl font-bold">{stats.assigned}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaCheckCircle className="text-green-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">확정 완료</p>
                      <p className="text-2xl font-bold">{stats.confirmed}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaClock className="text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">확정 대기</p>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FaCheck className="text-purple-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">확정률</p>
                      <p className="text-2xl font-bold">{stats.confirmationRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">일괄 확정 관리</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleBulkConfirm('all', { confirmAll: true })}
                  disabled={isSubmitting || pendingSeats.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center"
                >
                  <FaCheckCircle className="mr-2" />
                  모든 배정 좌석 확정 ({pendingSeats.length}개)
                </button>
                
                {stats?.roomStats?.map(room => (
                  <button
                    key={room._id}
                    onClick={() => handleBulkConfirm('room', { roomNumbers: [room._id] })}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
                  >
                    {room._id}호 확정 ({room.assigned - room.confirmed}개)
                  </button>
                ))}
                
                {selectedSeats.length > 0 && (
                  <button
                    onClick={() => handleBulkConfirm('selected', { seatIds: selectedSeats })}
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
                  >
                    선택 좌석 확정 ({selectedSeats.length}개)
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <h3 className="text-lg font-bold p-4 border-b">신청 좌석 목록</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSeats(pendingSeats.map(s => s._id));
                            } else {
                              setSelectedSeats([]);
                            }
                          }}
                          checked={selectedSeats.length === pendingSeats.length && pendingSeats.length > 0}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">방 번호</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">좌석 번호</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">우선순위</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedSeats.map((seat) => {
                      const user = getUserBySeatId(seat.assignedTo);
                      return (
                        <tr key={seat._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {!seat.confirmed && (
                              <input
                                type="checkbox"
                                checked={selectedSeats.includes(seat._id)}
                                onChange={() => handleSelectSeat(seat._id)}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {seat.roomNumber}호
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {seat.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {seat.assignedTo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user?.priority || '-'}순위
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {seat.confirmed ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                확정됨
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                확정 대기
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {!seat.confirmed && (
                              <button
                                onClick={() => handleBulkConfirm('single', { seatIds: [seat._id] })}
                                disabled={isSubmitting}
                                className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                              >
                                확정
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'management':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <h2 className="text-xl font-bold p-4 border-b">좌석 목록</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">좌석 번호</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구역</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">방 번호</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">배정 상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {seats.map((seat) => (
                      <tr key={seat._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{seat.number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seat.section}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seat.roomNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seat.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${seat.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {seat.active ? '활성화' : '비활성화'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {seat.assignedTo ? (
                            seat.confirmed ? 
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                확정됨
                              </span> : 
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                배정됨
                              </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              미배정
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-indigo-600 hover:text-indigo-900" title="수정">
                              <FaEdit />
                            </button>
                            <button className="text-red-600 hover:text-red-900" title="삭제">
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title="좌석 관리 - 연구실 자리 배정 시스템">
      <ClientOnly>
        <AdminNav />
      </ClientOnly>
      
      <div className="min-h-screen bg-gray-100 md:ml-64">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary">좌석 관리</h1>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
              >
                <FaPlus className="mr-2" /> 좌석 추가
              </button>
              <button 
                onClick={() => setShowResetModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center"
              >
                <FaUndo className="mr-2" /> 좌석 초기화
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('grid')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'grid'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  좌석 배치도
                </button>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'assignments'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  신청 좌석 확정
                  {pendingSeats.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {pendingSeats.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('management')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'management'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  좌석 목록 관리
                </button>
              </nav>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : seats.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 text-lg mb-4">등록된 좌석이 없습니다</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                좌석 추가하기
              </button>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">좌석 추가</h2>
            
            <div className="mb-4">
              <ul className="flex border-b">
                <li className="mr-1">
                  <a href="#single" className="inline-block py-2 px-4 text-blue-500 hover:text-blue-800 font-semibold">단일 추가</a>
                </li>
                <li className="mr-1">
                  <a href="#batch" className="inline-block py-2 px-4 text-blue-500 hover:text-blue-800 font-semibold">일괄 추가</a>
                </li>
              </ul>
            </div>
            
            <div id="single">
              <form onSubmit={handleAddSeat}>
                <div className="mb-4">
                  <label htmlFor="number" className="block text-gray-700 text-sm font-bold mb-2">
                    좌석 번호
                  </label>
                  <input
                    type="text"
                    id="number"
                    name="number"
                    value={newSeatData.number}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="예: A1, B2, C3"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="section" className="block text-gray-700 text-sm font-bold mb-2">
                    구역
                  </label>
                  <input
                    type="text"
                    id="section"
                    name="section"
                    value={newSeatData.section}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="예: 1층, 2층, A존"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="type" className="block text-gray-700 text-sm font-bold mb-2">
                    좌석 유형
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={newSeatData.type}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="regular">일반</option>
                    <option value="special">특별</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                
                <div className="mb-6 flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    name="active"
                    checked={newSeatData.active}
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
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-600">좌석 초기화</h2>
            <p className="text-gray-600 mb-6">
              정말로 모든 좌석 배정을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              >
                취소
              </button>
              <button
                onClick={handleResetSeats}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리중...' : '초기화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 