const express = require('express');
const { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  resetSeats, 
  exportSeats, 
  createBatchSeats 
} = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes need authentication and admin role
router.use(protect);
router.use(authorize(true));

// User management routes
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Seat management routes
router.put('/seats/reset', resetSeats);
router.get('/seats/export', exportSeats);
router.post('/seats/batch', createBatchSeats);

module.exports = router; 