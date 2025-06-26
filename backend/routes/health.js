const express = require('express');
const router = express.Router();

// @desc    Health check endpoint
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();
  
  res.status(200).json({
    success: true,
    message: 'Server is alive! 🚀',
    uptime: `${Math.floor(uptime / 60)} minutes ${Math.floor(uptime % 60)} seconds`,
    timestamp: timestamp,
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router; 