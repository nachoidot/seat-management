import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCurrentUser } from '../utils/auth';
import { assignSeat, unassignSeat, confirmSeat } from '../utils/api';
import { FaColumns, FaFan, FaWindowMaximize, FaDoorOpen, FaMapMarkerAlt } from 'react-icons/fa';

const SeatGrid = ({ seats, onSeatUpdate, isAdmin = false, filterRoom = null }) => {
  const [roomGroupedSeats, setRoomGroupedSeats] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [userAssignedSeat, setUserAssignedSeat] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;
    
    const user = getCurrentUser();
    setCurrentUser(user);

    // 좌석을 룸 번호별로 그룹화
    if (seats && seats.length > 0) {
      try {
        const grouped = {};
        
        // 먼저 룸 번호별로 좌석을 그룹화
        seats.forEach(seat => {
          if (!grouped[seat.roomNumber]) {
            grouped[seat.roomNumber] = [];
          }
          grouped[seat.roomNumber].push(seat);
          
          // 현재 사용자에게 배정된 좌석 확인
          if (user && seat.assignedTo === user.studentId) {
            setUserAssignedSeat(seat);
            
            // 사용자의 좌석이 있는 방을 기본으로 활성화
            if (filterRoom === null) {
              setActiveRoom(seat.roomNumber);
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
        
        setRoomGroupedSeats(grouped);
        
        // 필터링된 룸이 있으면 해당 룸을 활성화
        if (filterRoom && grouped[filterRoom]) {
          setActiveRoom(filterRoom);
        } else if (Object.keys(grouped).length > 0 && !activeRoom) {
          // 아니면 첫 번째 룸을 활성화 (사용자 좌석이 있는 방이 이미 활성화되지 않은 경우)
          setActiveRoom(Object.keys(grouped)[0]);
        }
      } catch (error) {
        console.error('Error creating seat grid:', error);
      }
    }
  }, [seats, filterRoom]);

  const handleSeatClick = async (seat) => {
    if (loading || typeof window === 'undefined') return;
    
    setSelectedSeat(seat);
    
    // 관리자가 아니고 현재 사용자가 이미 다른 좌석을 배정받은 경우
    if (!isAdmin && userAssignedSeat && userAssignedSeat._id !== seat._id && !seat.assignedTo) {
      const confirm = window.confirm(`이미 ${userAssignedSeat.roomNumber}호 ${userAssignedSeat.number}번 좌석을 배정받으셨습니다. 기존 좌석을 취소하고 이 좌석으로 변경하시겠습니까?`);
      if (confirm) {
        await handleUnassignSeat(userAssignedSeat);
        await handleAssignSeat(seat);
      }
      return;
    }
    
    // If seat is already assigned to current user, offer to unassign
    if (seat.assignedTo === currentUser?.studentId) {
      // Use a safer browser API check
      if (window.confirm) {
        const confirm = window.confirm('현재 배정된 좌석을 취소하시겠습니까?');
        if (confirm) {
          await handleUnassignSeat(seat);
        }
      }
      return;
    }
    
    // If seat is already assigned to someone else
    if (seat.assignedTo && !isAdmin) {
      toast.error('이미 배정된 좌석입니다.');
      return;
    }
    
    // If admin, show additional options
    if (isAdmin) {
      if (seat.assignedTo) {
        if (seat.confirmed) {
          const confirm = window.confirm('배정을 취소하시겠습니까?');
          if (confirm) {
            await handleUnassignSeat(seat);
          }
        } else {
          const confirm = window.confirm('배정을 확정하시겠습니까?');
          if (confirm) {
            await handleConfirmSeat(seat);
          }
        }
      } else {
        // Admin can assign to any user (implementation would need user selection UI)
        const confirm = window.confirm('이 좌석을 배정하시겠습니까?');
        if (confirm) {
          await handleAssignSeat(seat);
        }
      }
      return;
    }
    
    // Normal user assigning a seat
    const confirm = window.confirm('이 좌석을 신청하시겠습니까?');
    if (confirm) {
      await handleAssignSeat(seat);
    }
  };

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
      
      // 사용자 배정 좌석 업데이트
      setUserAssignedSeat(result.data);
      
      if (onSeatUpdate) {
        onSeatUpdate();
      }
    } catch (error) {
      console.error('Error assigning seat:', error);
      toast.error(error.response?.data?.message || '좌석 배정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignSeat = async (seat) => {
    try {
      setLoading(true);
      const result = await unassignSeat(seat.number, seat.section);
      toast.success('좌석 배정이 취소되었습니다.');
      
      // 사용자 배정 좌석 초기화
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
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
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
    </div>
  );
};

export default SeatGrid; 