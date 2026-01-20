const express = require('express');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sinfgram', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Socket.IO for real-time chat
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User joined chat: ${chatId}`);
  });

  socket.on('leave-chat', (chatId) => {
    socket.leave(chatId);
  });

  socket.on('send-message', (data) => {
    const { chatId, message } = data;
    io.to(chatId).emit('receive-message', message);
  });

  socket.on('typing', (data) => {
    const { chatId, userId } = data;
    socket.to(chatId).emit('user-typing', userId);
  });

  socket.on('stop-typing', (data) => {
    const { chatId, userId } = data;
    socket.to(chatId).emit('user-stop-typing', userId);
  });

  socket.on('user-online', (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit('user-status-change', { userId, status: 'online' });
  });

  socket.on('user-offline', (userId) => {
    activeUsers.delete(userId);
    io.emit('user-status-change', { userId, status: 'offline' });
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        io.emit('user-status-change', { userId, status: 'offline' });
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});