const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Please add a student ID'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  password: {
    type: String,
    required: false, // 기존 사용자 호환성을 위해 false로 변경
    minlength: 6,
    select: false // 기본적으로 비밀번호는 조회 시 제외
  },
  birthdate: {
    type: String,
    required: false, // 선택사항으로 변경
    default: '', // 기본값을 빈 문자열로 설정
    trim: true
  },
  priority: {
    type: Number,
    default: 3,  // 1 = highest priority, 12 = lowest
    min: 1,
    max: 12
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 비밀번호 해시화 미들웨어
UserSchema.pre('save', async function(next) {
  // 비밀번호가 수정되지 않았으면 다음으로
  if (!this.isModified('password')) {
    next();
  }

  // 비밀번호 해시화
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 비밀번호 검증 메서드
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create virtual property for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.name}`;
});

// User 모델을 'users' 컬렉션에 명시적으로 연결
const UserModel = mongoose.model('User', UserSchema, 'users');

module.exports = UserModel; 