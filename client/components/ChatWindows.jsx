import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';

function ChatWindow({ chat, user, socket }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chat) {
      loadMessages();
      socket.emit('join-chat', chat._id);
    }

    return () => {
      if (chat) {
        socket.emit('leave-chat', chat._id);
      }
    };
  }, [chat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chats/${chat._id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Xabarlarni yuklashda xatolik:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chats/${chat._id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          type: 'text'
        })
      });

      const message = await response.json();
      
      socket.emit('send-message', {
        chatId: chat._id,
        message
      });

      setNewMessage('');
      setTypingUsers([]);
    } catch (error) {
      console.error('Xabar yuborishda xatolik:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { chatId: chat._id, userId: user.id });
      
      setTimeout(() => {
        setIsTyping(false);
        socket.emit('stop-typing', { chatId: chat._id, userId: user.id });
      }, 3000);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{chat.name || chat.members.find(m => m._id !== user.id)?.username}</h3>
        <div className="chat-status">
          {typingUsers.length > 0 && (
            <span className="typing-indicator">
              {typingUsers.join(', ')} yozyapti...
            </span>
          )}
        </div>
      </div>

      <div className="messages-container">
        {messages.map(message => (
          <div
            key={message._id}
            className={`message ${message.sender._id === user.id ? 'sent' : 'received'}`}
          >
            <div className="message-sender">
              <img 
                src={message.sender.avatar || '/default-avatar.png'} 
                alt={message.sender.username}
              />
              <span>{message.sender.username}</span>
            </div>
            <div className="message-content">
              <p>{message.content.text}</p>
              <span className="message-time">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Xabar yozing..."
          className="message-input"
        />
        <button type="submit" className="send-btn">
          Yuborish
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;