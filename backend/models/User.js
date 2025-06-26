const mongoose = require('mongoose');

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
  birthdate: {
    type: String,
    required: [true, 'Please add a birthdate'],
    trim: true
  },
  priority: {
    type: Number,
    default: 3,  // 1 = highest priority, 3 = regular
    min: 1,
    max: 3
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

// Create virtual property for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.name}`;
});

// User 모델을 'users' 컬렉션에 명시적으로 연결
const UserModel = mongoose.model('User', UserSchema, 'users');
console.log('User 모델 컬렉션 이름:', UserModel.collection.name);

module.exports = UserModel; 