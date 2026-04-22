import React, { useState } from 'react';
import './UsernameScreen.css';

function UsernameScreen({ onSubmit }) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="username-screen">
      <div className="username-card">
        <div className="username-header">
          <h1>Imposters</h1>
          <p>Enter your username to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter Here"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            maxLength={20}
          />
          <button 
            type="submit" 
            className="button button-primary"
            disabled={!username.trim()}
          >
            Continue
          </button>
        </form>

        <div className="username-tips">
          <p>💡 Tips: Choose a unique and memorable username</p>
        </div>
      </div>
    </div>
  );
}

export default UsernameScreen;
