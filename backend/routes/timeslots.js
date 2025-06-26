const express = require('express');
const { 
  getTimeSlots, 
  getTimeSlot, 
  createTimeSlot, 
  updateTimeSlot, 
  deleteTimeSlot 
} = require('../controllers/timeslots');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getTimeSlots);
router.get('/:id', getTimeSlot);
router.post('/', protect, authorize(true), createTimeSlot);
router.put('/:id', protect, authorize(true), updateTimeSlot);
router.delete('/:id', protect, authorize(true), deleteTimeSlot);

module.exports = router; 