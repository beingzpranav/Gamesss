import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './GoogleAuthScreen.css';

function GoogleAuthScreen({ onAuthSuccess }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async (credentialResponse) => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
      
      // Verify token with backend
      const response = await axios.post(`${BACKEND_URL}/api/auth/google`, {
        idToken: credentialResponse.credential,
        username
      });

      if (response.data.success) {
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('username', response.data.username);

        onAuthSuccess({
          token: response.data.token,
          userId: response.data.userId,
          username: response.data.username
        });
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <h1>IMPOSTER GAME</h1>
          <p>Sign in to play</p>
        </div>

        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="username">Choose Your Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              maxLength={20}
            />
          </div>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError('Google login failed')}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {loading && <div className="auth-loading">Authenticating...</div>}
        </form>

        <div className="auth-footer">
          <p>Sign in with your Google account to play with others</p>
        </div>
      </div>
    </div>
  );
}

export default GoogleAuthScreen;
