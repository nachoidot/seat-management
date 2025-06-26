const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '일정 제목을 입력해주세요'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  baseDate: {
    type: Date,
    required: [true, '배정 시작일을 입력해주세요']
  },
  endDate: {
    type: Date,
    required: [true, '배정 종료일을 입력해주세요']
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TimeSlot', TimeSlotSchema); 