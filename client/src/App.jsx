import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Auth from './components/Auth';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import UserProfile from './components/UserProfile';
import Search from './components/Search';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [user, setUser] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      socket.emit('user-online', JSON.parse(savedUser).id);
    }

    socket.on('receive-message', handleNewMessage);
    socket.on('user-status-change', handleUserStatusChange);

    return () => {
      socket.off('receive-message');
      socket.off('user-status-change');
      if (user) {
        socket.emit('user-offline', user.id);
      }
    };
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    socket.emit('user-online', userData.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.emit('user-offline', user.id);
    setUser(null);
    setCurrentChat(null);
  };

  const handleNewMessage = (message) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat._id === message.chatId 
          ? { ...chat, lastMessage: message, updatedAt: new Date() }
          : chat
      )
    );
  };

  const handleUserStatusChange = ({ userId, status }) => {
    setChats(prevChats => 
      prevChats.map(chat => ({
        ...chat,
        members: chat.members.map(member =>
          member._id === userId ? { ...member, status } : member
        )
      }))
    );
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>SinfGram</h1>
          <button onClick={handleLogout} className="logout-btn">
            Chiqish
          </button>
        </header>

        <div className="main-content">
          <aside className="sidebar">
            <UserProfile user={user} />
            <Search user={user} />
            <ChatList 
              chats={chats} 
              onSelectChat={setCurrentChat}
              currentUser={user}
            />
          </aside>

          <main className="chat-area">
            <Routes>
              <Route path="/" element={
                currentChat ? (
                  <ChatWindow 
                    chat={currentChat}
                    user={user}
                    socket={socket}
                  />
                ) : (
                  <div className="welcome-screen">
                    <h2>Xush kelibsiz, {user.username}!</h2>
                    <p>Chatni tanlang yoki yangi chat boshlang</p>
                  </div>
                )
              } />
            </Routes>
          </main>
        </div>

        <footer className="app-footer">
          <p>Savol va takliflar uchun senior_o11 telegram profilga yozishingiz mumkin. 2026-yil. Barcha kamchiliklar to'ldiriladi.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;