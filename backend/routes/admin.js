const express = require('express');
const { 
  getUsers, 
  getSeats, 
  resetAllSeats, 
  exportSeats,
  bulkCreateUsers,
  bulkConfirmSeats,
  getSeatAssignmentStats
} = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes need authentication and admin role
router.use(protect);
router.use(authorize(true));

// User management routes
router.get('/users', getUsers);
router.post('/users/bulk', bulkCreateUsers);

// Seat management routes
router.get('/seats', getSeats);
router.post('/seats/reset', resetAllSeats);
router.get('/seats/export', exportSeats);
router.post('/seats/bulk-confirm', bulkConfirmSeats);
router.get('/seats/assignment-stats', getSeatAssignmentStats);

module.exports = router; 