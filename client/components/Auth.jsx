import React, { useState } from 'react';
import './Auth.css';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Parollar mos kelmadi');
      return;
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Xatolik yuz berdi');
      }

      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish'}</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Foydalanuvchi nomi</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength="3"
              maxLength="20"
            />
          </div>

          <div className="form-group">
            <label>Parol</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Parolni tasdiqlash</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength="6"
              />
            </div>
          )}

          <button type="submit" className="auth-btn">
            {isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? 'Hali akkauntingiz yo\'qmi?' : 'Allaqachon akkauntingiz bormi?'}
          <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
            {isLogin ? 'Ro\'yxatdan o\'ting' : 'Kirish'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;