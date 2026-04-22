import React, { useState } from 'react';
import './MainMenu.css';

function MainMenu({ username, onCreateRoom, onJoinRoom }) {
  const [view, setView] = useState('menu'); // menu, create, join
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [roomCode, setRoomCode] = useState('');

  const handleCreateClick = () => {
    if (maxParticipants >= 2) {
      onCreateRoom(maxParticipants);
    }
  };

  const handleJoinClick = () => {
    if (roomCode.trim()) {
      onJoinRoom(roomCode.toUpperCase());
    }
  };

  return (
    <div className="main-menu">
      {view === 'menu' && (
        <div className="menu-card">
          <div className="menu-header">
            <h1>🎮 GAME</h1>
            <p>Welcome, <span className="username-display">{username}</span></p>
          </div>

          <div className="menu-buttons">
            <button 
              className="button button-primary menu-button"
              onClick={() => setView('create')}
            >
              ➕ Create Room
            </button>
            <button 
              className="button button-secondary menu-button"
              onClick={() => setView('join')}
            >
              🚪 Join Room
            </button>
          </div>

          <div className="menu-info">
            <p>👥 Play with friends in real-time</p>
            <p>🎯 One vs Many gameplay</p>
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="menu-card">
          <h2>Create a Room</h2>
          <div className="form-group">
            <label>Number of Participants (including you)</label>
            <input
              type="number"
              min="2"
              max="16"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
            />
            <small>2-16 players</small>
          </div>

          <div className="button-group">
            <button 
              className="button button-primary"
              onClick={handleCreateClick}
            >
              Create Room
            </button>
            <button 
              className="button button-secondary"
              onClick={() => setView('menu')}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div className="menu-card">
          <h2>Join a Room</h2>
          <div className="form-group">
            <label>Room Code</label>
            <input
              type="text"
              placeholder="Enter room code (e.g., ABC123)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength="6"
              autoFocus
            />
          </div>

          <div className="button-group">
            <button 
              className="button button-primary"
              onClick={handleJoinClick}
              disabled={!roomCode.trim()}
            >
              Join Room
            </button>
            <button 
              className="button button-secondary"
              onClick={() => {
                setView('menu');
                setRoomCode('');
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;
