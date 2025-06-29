import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { toast } from 'react-toastify';
import { getCurrentUser } from '../utils/auth';
import { assignSeat, unassignSeat, confirmSeat, adminAssignSeat, getUsers } from '../utils/api';
import { FaColumns, FaFan, FaWindowMaximize, FaDoorOpen, FaMapMarkerAlt } from 'react-icons/fa';

const SeatGrid = memo(({ seats, onSeatUpdate, isAdmin = false, filterRoom = null }) => {
  const [roomGroupedSeats, setRoomGroupedSeats] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [userAssignedSeat, setUserAssignedSeat] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  
  // 관리자용 상태들
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedSeatForAssign, setSelectedSeatForAssign] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // 현재 사용자 정보를 메모이제이션
  const user = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getCurrentUser();
  }, []);

  // 룸별 좌석 그룹화를 메모이제이션
  const processedSeats = useMemo(() => {
    if (!seats || seats.length === 0) return {};
    
    try {
      const grouped = {};
      let foundUserSeat = null;
      let defaultActiveRoom = null;
      
      // 먼저 룸 번호별로 좌석을 그룹화
      seats.forEach(seat => {
        if (!grouped[seat.roomNumber]) {
          grouped[seat.roomNumber] = [];
        }
        grouped[seat.roomNumber].push(seat);
        
        // 현재 사용자에게 배정된 좌석 확인
        if (user && seat.assignedTo === user.studentId) {
          foundUserSeat = seat;
          
          // 사용자의 좌석이 있는 방을 기본으로 활성화
          if (filterRoom === null) {
            defaultActiveRoom = seat.roomNumber;
          }
        }
      });
      
      // 각 룸 내에서 좌석을 행과 열로 배치
      Object.keys(grouped).forEach(roomNumber => {
        const roomSeats = grouped[roomNumber];
        const maxRow = Math.max(...roomSeats.map(seat => seat.row || 0));
        const maxCol = Math.max(...roomSeats.map(seat => seat.col || 0));
        
        const grid = Array(maxRow + 1).fill().map(() => Array(maxCol + 1).fill(null));
        
        roomSeats.forEach(seat => {
          if (seat && typeof seat.row === 'number' && typeof seat.col === 'number') {
            grid[seat.row][seat.col] = seat;
          }
        });
        
        grouped[roomNumber] = {
          seats: roomSeats,
          grid: grid
        };
      });
      
      return {
        grouped,
        userSeat: foundUserSeat,
        defaultRoom: filterRoom || defaultActiveRoom || Object.keys(grouped)[0]
      };
    } catch (error) {
      console.error('Error creating seat grid:', error);
      return {};
    }
  }, [seats, user, filterRoom]);

  useEffect(() => {
    setCurrentUser(user);
    
    if (processedSeats.grouped) {
      setRoomGroupedSeats(processedSeats.grouped);
      setUserAssignedSeat(processedSeats.userSeat);
      
      if (processedSeats.defaultRoom && !activeRoom) {
        setActiveRoom(processedSeats.defaultRoom);
      }
    }
  }, [processedSeats, user, activeRoom]);

  // 사용자 목록 로드를 useCallback으로 메모이제이션
  const loadUsers = useCallback(async () => {
    try {
      const response = await getUsers();
      const users = response.data || [];
      
      // admin 계정 제외하고 사용자 정보에 현재 배정된 좌석 정보 추가
      const filteredUsers = users.filter(user => user.studentId !== 'admin');
      const usersWithSeatInfo = filteredUsers.map(user => {
        const assignedSeat = seats.find(seat => seat.assignedTo === user.studentId);
        return {
          ...user,
          currentSeat: assignedSeat ? `${assignedSeat.roomNumber}호 ${assignedSeat.number}번` : null,
          hasAssignment: !!assignedSeat
        };
      });
      
      setAvailableUsers(usersWithSeatInfo);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }, [seats]);

  const handleSeatClick = useCallback(async (seat) => {
    if (loading || typeof window === 'undefined') return;
    
    setSelectedSeat(seat);
    
    // 관리자 모드
    if (isAdmin) {
      if (seat.assignedTo) {
        // 배정된 좌석을 클릭한 경우 - 취소 또는 확정 옵션
        const user = availableUsers.find(u => u.studentId === seat.assignedTo);
        const userName = user ? user.name : seat.assignedTo;
        
        if (seat.confirmed) {
          const confirm = window.confirm(
            `${userName} (${seat.assignedTo})의 좌석 배정을 취소하시겠습니까?\n\n${seat.roomNumber}호 ${seat.number}번 좌석`
          );
          if (confirm) {
            await handleUnassignSeat(seat);
          }
        } else {
          const action = window.confirm(
            `${userName} (${seat.assignedTo})의 좌석을 확정하시겠습니까?\n\n${seat.roomNumber}호 ${seat.number}번 좌석\n\n확인: 확정 / 취소: 배정 취소`
          );
          if (action) {
            await handleConfirmSeat(seat);
          } else {
            const cancelAssign = window.confirm('배정을 취소하시겠습니까?');
            if (cancelAssign) {
              await handleUnassignSeat(seat);
            }
          }
        }
      } else {
        // 빈 좌석을 클릭한 경우 - 사용자 선택 모달 열기
        setSelectedSeatForAssign(seat);
        await loadUsers();
        setShowUserSelectModal(true);
      }
      return;
    }
    
    // 일반 사용자 모드 (기존 로직)
    if (!isAdmin && userAssignedSeat && userAssignedSeat._id !== seat._id && !seat.assignedTo) {
      const confirm = window.confirm(`이미 ${userAssignedSeat.roomNumber}호 ${userAssignedSeat.number}번 좌석을 배정받으셨습니다. 기존 좌석을 취소하고 이 좌석으로 변경하시겠습니까?`);
      if (confirm) {
        await handleUnassignSeat(userAssignedSeat);
        await handleAssignSeat(seat);
      }
      return;
    }
    
    if (seat.assignedTo === currentUser?.studentId) {
      if (window.confirm) {
        const confirm = window.confirm('현재 배정된 좌석을 취소하시겠습니까?');
        if (confirm) {
          await handleUnassignSeat(seat);
        }
      }
      return;
    }
    
    if (seat.assignedTo && !isAdmin) {
      toast.error('이미 배정된 좌석입니다.');
      return;
    }
    
    const confirm = window.confirm('이 좌석을 신청하시겠습니까?');
    if (confirm) {
      await handleAssignSeat(seat);
    }
  }, [loading, isAdmin, availableUsers, userAssignedSeat, currentUser, loadUsers]);

  // 관리자용 좌석 배정을 useCallback으로 메모이제이션
  const handleAdminAssignSeat = useCallback(async (studentId) => {
    try {
      setLoading(true);
      const result = await adminAssignSeat(selectedSeatForAssign.number, selectedSeatForAssign.section, studentId);
      
      const user = availableUsers.find(u => u.studentId === studentId);
      toast.success(`${user?.name || studentId}님에게 ${selectedSeatForAssign.roomNumber}호 ${selectedSeatForAssign.number}번 좌석이 배정되었습니다.`);
      
      setShowUserSelectModal(false);
      setSelectedSeatForAssign(null);
      setUserSearchTerm('');
      
      if (onSeatUpdate) {
        onSeatUpdate();
      }
    } catch (error) {
      console.error('Error admin assigning seat:', error);
      toast.error(error.response?.data?.message || '좌석 배정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onSeatUpdate, selectedSeatForAssign, availableUsers]);

  const handleMouseEnter = (seat) => {
    if (!seat.objectType) {
      setHoveredSeat(seat);
    }
  };

  const handleMouseLeave = () => {
    setHoveredSeat(null);
  };

  const handleAssignSeat = async (seat) => {
    try {
      setLoading(true);
      const result = await assignSeat(seat.number, seat.section);
      toast.success('좌석이 성공적으로 배정되었습니다.');
      
      setUserAssignedSeat(result.data);
      
      if (onSeatUpdate) {
        onSeatUpdate();
      }
    } catch (error) {
      console.error('Error assigning seat:', error);
      
      // 이미 좌석을 가지고 있는 경우 특별 처리
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already have a seat')) {
        const currentSeat = error.response?.data?.data?.currentSeat;
        if (currentSeat) {
          const confirmChange = window.confirm(
            `이미 ${currentSeat.roomNumber}호 ${currentSeat.number}번 좌석을 배정받으셨습니다.\n` +
            `기존 좌석을 취소하고 ${seat.roomNumber}호 ${seat.number}번 좌석으로 변경하시겠습니까?`
          );
          
          if (confirmChange) {
            try {
              // 기존 좌석 해제
              await unassignSeat(currentSeat.number, currentSeat.section);
              // 새 좌석 배정
              const newResult = await assignSeat(seat.number, seat.section);
              toast.success(`좌석이 ${seat.roomNumber}호 ${seat.number}번으로 변경되었습니다.`);
              setUserAssignedSeat(newResult.data);
              
              if (onSeatUpdate) {
                onSeatUpdate();
              }
            } catch (changeError) {
              console.error('Error changing seat:', changeError);
              toast.error('좌석 변경 중 오류가 발생했습니다.');
            }
          }
        } else {
          toast.error('이미 다른 좌석을 배정받으셨습니다. 페이지를 새로고침 해주세요.');
        }
      } else {
        // 기타 에러
        toast.error(error.response?.data?.message || '좌석 배정 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignSeat = async (seat) => {
    try {
      setLoading(true);
      const result = await unassignSeat(seat.number, seat.section);
      toast.success('좌석 배정이 취소되었습니다.');
      
      setUserAssignedSeat(null);
      
      if (onSeatUpdate) {
        onSeatUpdate();
      }
    } catch (error) {
      console.error('Error unassigning seat:', error);
      toast.error(error.response?.data?.message || '좌석 배정 취소 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSeat = async (seat) => {
    try {
      setLoading(true);
      const result = await confirmSeat(seat.number, seat.section);
      toast.success('좌석 배정이 확정되었습니다.');
      
      if (onSeatUpdate) {
        onSeatUpdate();
      }
    } catch (error) {
      console.error('Error confirming seat:', error);
      toast.error(error.response?.data?.message || '좌석 배정 확정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getSeatClass = (seat) => {
    if (!seat) return '';
    
    if (seat.objectType) {
      return `object object-${seat.objectType}`;
    }
    
    let className = 'seat ';
    
    // 배정된 좌석 먼저 확인 (배정이 확정보다 우선)
    if (seat.assignedTo) {
      className += 'seat-assigned ';
      
      // 확정된 좌석
      if (seat.confirmed) {
        className += 'seat-confirmed ';
      }
    } else {
      className += 'seat-available ';
    }
    
    // 현재 사용자에게 배정된 좌석은 특별 표시
    if (seat.assignedTo === currentUser?.studentId) {
      className += 'seat-mine ';
    }
    
    // 호버 상태 표시
    if (hoveredSeat && hoveredSeat._id === seat._id) {
      className += 'seat-hovered ';
    }
    
    return className;
  };

  const getObjectIcon = (objectType) => {
    switch(objectType) {
      case 'pillar':
        return <FaColumns className="text-gray-600 text-2xl" />;
      case 'window':
        return <FaWindowMaximize className="text-blue-300 text-2xl" />;
      case 'ac':
        return <FaFan className="text-blue-400 text-2xl" />;
      case 'door':
        return <FaDoorOpen className="text-brown-500 text-2xl" />;
      case 'label':
        return <FaMapMarkerAlt className="text-red-500 text-xl" />;
      default:
        return null;
    }
  };

  const getRoomTypeLabel = (roomNumber) => {
    if (['501', '503', '505', '507'].includes(roomNumber)) {
      return '박사 연구실';
    }
    return '석사 연구실';
  };

  // SSR 중에는 로딩 상태 표시
  if (typeof window === 'undefined') {
    return null; // 서버에서는 아무것도 렌더링하지 않음
  }

  if (Object.keys(roomGroupedSeats).length === 0) {
    return <div className="text-center py-8">좌석 정보를 불러오는 중...</div>;
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
          <div className="text-primary font-bold">처리중...</div>
        </div>
      )}
      
      {!isAdmin && userAssignedSeat && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="font-semibold text-blue-800">
            현재 배정된 좌석: {userAssignedSeat.roomNumber}호 {userAssignedSeat.number}번
            {userAssignedSeat.confirmed ? ' (확정됨)' : ' (확정 대기 중)'}
          </p>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">연구실 선택</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(roomGroupedSeats).sort().map(roomNumber => (
            <button
              key={roomNumber}
              onClick={() => setActiveRoom(roomNumber)}
              className={`px-4 py-2 rounded ${
                activeRoom === roomNumber
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              } ${userAssignedSeat && userAssignedSeat.roomNumber === roomNumber ? 'border-2 border-blue-500' : ''}`}
            >
              {roomNumber}호 ({getRoomTypeLabel(roomNumber)})
              {userAssignedSeat && userAssignedSeat.roomNumber === roomNumber && ' ✓'}
            </button>
          ))}
        </div>
      </div>
      
      {hoveredSeat && hoveredSeat.assignedTo && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
            background: '#FEF9C3',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: 12,
            minWidth: 200,
            textAlign: 'center'
          }}
        >
          <p style={{ color: '#B45309' }}>
            <strong>학번:</strong> {hoveredSeat.assignedTo}
            {hoveredSeat.confirmed && ' (확정)'}
          </p>
        </div>
      )}
      
      {activeRoom && roomGroupedSeats[activeRoom] && (
        <div>
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <h3 className="text-xl font-bold mb-2">{activeRoom}호 {getRoomTypeLabel(activeRoom)}</h3>
            <p className="text-sm text-gray-600">
              총 {roomGroupedSeats[activeRoom].seats.length}개 좌석 | 
              배정됨: {roomGroupedSeats[activeRoom].seats.filter(s => s.assignedTo).length}개 | 
              빈 좌석: {roomGroupedSeats[activeRoom].seats.filter(s => !s.assignedTo).length}개
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <div 
              className="seat-grid" 
              style={{ 
                gridTemplateRows: `repeat(${roomGroupedSeats[activeRoom].grid.length}, 60px)`,
                gridTemplateColumns: `repeat(${roomGroupedSeats[activeRoom].grid[0]?.length || 1}, 60px)` 
              }}
            >
              {roomGroupedSeats[activeRoom].grid.map((row, rowIndex) => (
                row.map((seat, colIndex) => (
                  seat ? (
                    seat.objectType ? (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={getSeatClass(seat)}
                        title={seat.objectName || seat.objectType}
                      >
                        {getObjectIcon(seat.objectType)}
                        {seat.objectName && <small className="block text-xs">{seat.objectName}</small>}
                      </div>
                    ) : (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={getSeatClass(seat)}
                        onClick={() => handleSeatClick(seat)}
                        onMouseEnter={() => handleMouseEnter(seat)}
                        onMouseLeave={handleMouseLeave}
                        title={seat.assignedTo 
                          ? `배정됨: ${seat.assignedTo}${seat.confirmed ? ' (확정)' : ''}` 
                          : '배정 가능'}
                      >
                        {seat.number}
                      </div>
                    )
                  ) : (
                    <div 
                      key={`${rowIndex}-${colIndex}`} 
                      className="empty-space"
                    ></div>
                  )
                ))
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-center space-x-4 flex-wrap">
        <div className="flex items-center m-1">
          <div className="seat seat-available w-5 h-5 mr-2"></div>
          <span className="text-sm">배정 가능</span>
        </div>
        <div className="flex items-center m-1">
          <div className="seat seat-assigned w-5 h-5 mr-2"></div>
          <span className="text-sm">배정됨</span>
        </div>
        <div className="flex items-center m-1">
          <div className="seat seat-confirmed w-5 h-5 mr-2"></div>
          <span className="text-sm">확정됨</span>
        </div>
        <div className="flex items-center m-1">
          <div className="seat seat-mine w-5 h-5 mr-2"></div>
          <span className="text-sm">내 좌석</span>
        </div>
      </div>

      {/* 관리자용 사용자 선택 모달 */}
      {showUserSelectModal && selectedSeatForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              사용자 선택 - {selectedSeatForAssign.roomNumber}호 {selectedSeatForAssign.number}번 좌석
            </h2>
            
            {/* 검색 입력 */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="학번 또는 이름으로 검색..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 사용자 목록 */}
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">우선순위</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">현재 좌석 배정 상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availableUsers
                    .filter(user => 
                      !userSearchTerm || 
                      user.studentId.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      user.name.toLowerCase().includes(userSearchTerm.toLowerCase())
                    )
                    .map((user) => (
                      <tr key={user.studentId} className={`hover:bg-gray-50 ${user.hasAssignment ? 'bg-yellow-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.priority}순위
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.hasAssignment ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {user.currentSeat}
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              미배정
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (user.hasAssignment) {
                                const confirm = window.confirm(
                                  `${user.name}님은 이미 ${user.currentSeat}에 배정되어 있습니다.\n기존 배정을 취소하고 새로운 좌석으로 변경하시겠습니까?`
                                );
                                if (confirm) {
                                  handleAdminAssignSeat(user.studentId);
                                }
                              } else {
                                handleAdminAssignSeat(user.studentId);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                            disabled={loading}
                          >
                            {user.hasAssignment ? '변경 배정' : '배정'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* 모달 하단 버튼 */}
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserSelectModal(false);
                  setSelectedSeatForAssign(null);
                  setUserSearchTerm('');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default SeatGrid; 