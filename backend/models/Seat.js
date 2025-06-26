const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
  number: {
    type: String,
    required: [true, 'Please add a seat number'],
    trim: true
  },
  section: {
    type: String,
    required: [true, 'Please add a section'],
    trim: true
  },
  roomNumber: {
    type: String,
    required: [true, 'Please add a room number'],
    enum: ['501', '503', '504', '505', '506', '507', '508', '510'],
    trim: true
  },
  type: {
    type: String,
    enum: ['석사', '박사'],
    required: [true, 'Please specify if this seat is for 석사 or 박사'],
    default: '석사'
  },
  active: {
    type: Boolean,
    default: true
  },
  row: {
    type: Number,
    required: [true, 'Please add a row number']
  },
  col: {
    type: Number,
    required: [true, 'Please add a column number']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  assignedTo: {
    type: String,
    default: null,
    ref: 'User'
  },
  confirmed: {
    type: Boolean,
    default: false
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

SeatSchema.index({ number: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Seat', SeatSchema); 