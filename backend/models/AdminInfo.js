const mongoose = require('mongoose');

const AdminInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add admin name'],
    trim: true,
    default: '관리자'
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    trim: true,
    default: '02-0000-0000'
  },
  email: {
    type: String,
    required: [true, 'Please add email'],
    trim: true,
    default: 'admin@sogang.ac.kr'
  },
  department: {
    type: String,
    default: '경제학과',
    trim: true
  },
  position: {
    type: String,
    default: '주임조교',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 업데이트 시 updatedAt 자동 갱신
AdminInfoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const AdminInfoModel = mongoose.model('AdminInfo', AdminInfoSchema, 'admininfo');

module.exports = AdminInfoModel; 