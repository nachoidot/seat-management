const Seat = require('../models/Seat');
const User = require('../models/User');
const TimeSlot = require('../models/TimeSlot');

// @desc    Get all seats
// @route   GET /api/seats
// @access  Public
exports.getSeats = async (req, res) => {
  try {
    const seats = await Seat.find();
    
    if (!seats) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    res.status(200).json({
      success: true,
      count: seats.length,
      data: seats
    });
  } catch (err) {
    console.error('Error fetching seats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get single seat
// @route   GET /api/seats/:number/:section
// @access  Public
exports.getSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    if (!number || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both seat number and section'
      });
    }
    
    const seat = await Seat.findOne({ number, section });

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    console.error('Error fetching seat:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Assign a seat to a student
// @route   PUT /api/seats/:number/:section/assign
// @access  Private
exports.assignSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    // 입력 검증
    if (!number || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both seat number and section'
      });
    }
    
    // Check if user can currently register
    const user = await User.findOne({ studentId: req.user.studentId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current time is within the allowed time slot for this user's priority
    const now = new Date();
    const timeSlot = await TimeSlot.findOne({
      priority: user.priority,
      openTime: { $lte: now },
      closeTime: { $gte: now }
    });

    if (!timeSlot && !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You cannot register at this time'
      });
    }

    // Check if seat is available
    let seat = await Seat.findOne({ number, section });
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    if (seat.assignedTo && !user.isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This seat is already assigned'
      });
    }

    // Check if user already has a seat
    const existingSeat = await Seat.findOne({ assignedTo: req.user.studentId });
    if (existingSeat && !user.isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'You already have a seat assigned'
      });
    }

    // Update seat
    seat = await Seat.findOneAndUpdate(
      { number, section },
      { 
        assignedTo: req.user.studentId,
        confirmed: user.isAdmin ? true : false,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    console.error('Error assigning seat:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Unassign a seat
// @route   PUT /api/seats/:number/:section/unassign
// @access  Private
exports.unassignSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    // 입력 검증
    if (!number || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both seat number and section'
      });
    }
    
    // Check if seat exists
    let seat = await Seat.findOne({ number, section });
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    // Check if user is admin or the seat is assigned to the user
    if (!req.user.isAdmin && seat.assignedTo !== req.user.studentId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to unassign this seat'
      });
    }

    // Update seat
    seat = await Seat.findOneAndUpdate(
      { number, section },
      { assignedTo: null, confirmed: false, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    console.error('Error unassigning seat:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Confirm a seat assignment (Admin only)
// @route   PUT /api/seats/:number/:section/confirm
// @access  Private (Admin only)
exports.confirmSeat = async (req, res) => {
  try {
    const { number, section } = req.params;
    
    // 입력 검증
    if (!number || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both seat number and section'
      });
    }
    
    // Check if seat exists
    let seat = await Seat.findOne({ number, section });
    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `Seat not found with number ${number} in section ${section}`
      });
    }

    // Make sure seat is assigned to someone
    if (!seat.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'This seat is not assigned to anyone'
      });
    }

    // Update seat
    seat = await Seat.findOneAndUpdate(
      { number, section },
      { confirmed: true, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: seat
    });
  } catch (err) {
    console.error('Error confirming seat:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
}; 