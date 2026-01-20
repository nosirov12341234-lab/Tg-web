const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user._id }
    })
    .select('username avatar status lastSeen')
    .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username avatar status lastSeen createdAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user status
router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    req.user.status = status;
    req.user.lastSeen = Date.now();
    await req.user.save();

    res.json({ status: req.user.status, lastSeen: req.user.lastSeen });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;