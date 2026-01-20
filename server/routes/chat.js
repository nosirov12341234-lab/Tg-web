const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// Get user's chats
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      members: req.user._id
    })
    .populate('members', 'username avatar status')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search public chats
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    const chats = await Chat.find({
      type: 'public',
      $text: { $search: query }
    })
    .populate('members', 'username avatar')
    .limit(20);

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create chat
router.post('/', auth, async (req, res) => {
  try {
    const { type, name, members = [] } = req.body;
    
    const chat = new Chat({
      type,
      name: type === 'public' ? name : undefined,
      members: [...new Set([req.user._id, ...members.map(m => mongoose.Types.ObjectId(m))])],
      admins: [req.user._id],
      isGroup: members.length > 0 || type !== 'private'
    });

    await chat.save();
    await chat.populate('members', 'username avatar status');

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member to chat
router.post('/:chatId/members', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { username } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is admin or member can add
    if (!chat.admins.includes(req.user._id) && chat.type !== 'public') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const userToAdd = await User.findOne({ username });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (chat.members.includes(userToAdd._id)) {
      return res.status(400).json({ error: 'User already in chat' });
    }

    chat.members.push(userToAdd._id);
    await chat.save();

    res.json({ message: 'User added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat messages
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.members.includes(req.user._id)) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = await Message.find({ chatId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send message
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text', media } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.members.includes(req.user._id)) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const message = new Message({
      chatId,
      sender: req.user._id,
      content: {
        text: content,
        media: media || []
      },
      type
    });

    await message.save();
    await message.populate('sender', 'username avatar');

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.updatedAt = Date.now();
    await chat.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reaction to message
router.post('/messages/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Remove existing reaction from same user
    message.reactions = message.reactions.filter(
      reaction => !reaction.userId.equals(req.user._id)
    );

    // Add new reaction
    message.reactions.push({
      userId: req.user._id,
      emoji
    });

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;