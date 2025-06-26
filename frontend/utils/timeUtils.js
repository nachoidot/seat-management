/**
 * 우선순위에 따른 좌석 배정 시간 유틸리티
 */

// 우선순위별 배정 시간 정의 (시작 시간, 분)
const PRIORITY_TIMES = {
  11: { hour: 10, minute: 0 },  // 5학기 이상 조교
  10: { hour: 10, minute: 30 }, // 4학기 조교
  9: { hour: 11, minute: 0 },   // 3학기 조교
  8: { hour: 11, minute: 30 },  // 2학기 조교
  7: { hour: 12, minute: 0 },   // 1학기 조교
  6: { hour: 12, minute: 30 },  // 5학기 이상 비조교
  5: { hour: 13, minute: 0 },   // 4학기 비조교
  4: { hour: 13, minute: 30 },  // 3학기 비조교
  3: { hour: 14, minute: 0 },   // 2학기 비조교
  2: { hour: 14, minute: 30 },  // 1학기 비조교
  1: { hour: 15, minute: 0 },   // 수료생
  12: { hour: 15, minute: 30 }  // 기타
};

// 우선순위별 명칭
const PRIORITY_LABELS = {
  11: "5학기 이상 조교",
  10: "4학기 조교",
  9: "3학기 조교",
  8: "2학기 조교",
  7: "1학기 조교",
  6: "5학기 이상 비조교",
  5: "4학기 비조교",
  4: "3학기 비조교",
  3: "2학기 비조교",
  2: "1학기 비조교",
  1: "수료생",
  12: "기타"
};

/**
 * 우선순위에 따른 배정 시작 시간 계산
 * @param {Date} baseDate 기준 날짜
 * @param {Number} priority 우선순위 (1-12)
 * @returns {Date} 배정 시작 시간
 */
export const calculateStartTimeByPriority = (baseDate, priority) => {
  if (!baseDate || !priority || !PRIORITY_TIMES[priority]) {
    return null;
  }

  const date = new Date(baseDate);
  const { hour, minute } = PRIORITY_TIMES[priority];
  
  date.setHours(hour, minute, 0, 0);
  return date;
};

/**
 * 우선순위에 따른 배정 종료 시간 계산 (시작 후 30분)
 * @param {Date} baseDate 기준 날짜
 * @param {Number} priority 우선순위 (1-12)
 * @returns {Date} 배정 종료 시간
 */
export const calculateEndTimeByPriority = (baseDate, priority) => {
  const startTime = calculateStartTimeByPriority(baseDate, priority);
  if (!startTime) return null;
  
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + 30);
  return endTime;
};

/**
 * 우선순위 레이블 반환
 * @param {Number} priority 우선순위 (1-12)
 * @returns {String} 우선순위 레이블
 */
export const getPriorityLabel = (priority) => {
  return PRIORITY_LABELS[priority] || `${priority}유형`;
};

/**
 * 시간 포맷팅 (HH:MM AM/PM)
 * @param {Date} date 날짜 객체
 * @returns {String} 포맷된 시간
 */
export const formatTime = (date) => {
  if (!date) return '';
  
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export default {
  calculateStartTimeByPriority,
  calculateEndTimeByPriority,
  getPriorityLabel,
  formatTime,
  PRIORITY_TIMES,
  PRIORITY_LABELS
}; 