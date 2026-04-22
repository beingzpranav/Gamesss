import React, { useState } from 'react';
import './RoomLobby.css';

function RoomLobby({ 
  roomCode, 
  room, 
  username, 
  isGameMaster, 
  socket,
  onSubmitWords,
  onTransferGameMaster,
  onBackToMenu 
}) {
  const [showWordInput, setShowWordInput] = useState(false);
  const [normalWord, setNormalWord] = useState('');
  const [imposterWord, setImposterWord] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopyFeedback('✅ Code copied!');
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const handleSubmitWords = (e) => {
    e.preventDefault();
    if (normalWord.trim() && imposterWord.trim()) {
      onSubmitWords(normalWord, imposterWord);
      setNormalWord('');
      setImposterWord('');
      setShowWordInput(false);
    }
  };

  const handleTransferRole = (userId) => {
    if (userId !== socket.id) {
      onTransferGameMaster(userId);
      setSelectedUser(null);
    }
  };

  return (
    <div className="room-lobby">
      <div className="lobby-container">
        <div className="lobby-header">
          <div>
            <h2>Room Code: <span className="room-code">{roomCode}</span></h2>
            <p>👤 {username}</p>
            <div className="code-actions">
              <button 
                className="button button-small"
                onClick={handleCopyCode}
                title="Copy room code"
              >
                📋 Copy Code
              </button>
              {copyFeedback && <span className="copy-feedback">{copyFeedback}</span>}
            </div>
          </div>
          <button 
            className="button button-secondary"
            onClick={onBackToMenu}
          >
            ← Back
          </button>
        </div>

        <div className="lobby-content">
          {/* Players Section */}
          <div className="players-section">
            <h3>Players ({room?.users?.length}/{room?.maxParticipants})</h3>
            <div className="players-list">
              {room?.users?.map((user) => (
                <div key={user?.id} className={`player-card ${room?.gameMaster === user?.id ? 'game-master' : ''}`}>
                  <div className="player-info">
                    {room?.gameMaster === user?.id && <span className="badge">👑 GM</span>}
                    <p className="player-name">{user?.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Master Controls */}
          {isGameMaster && (
            <div className="gm-controls">
              <h3>Game Master Controls</h3>

              {/* Word Input */}
              {!showWordInput ? (
                <button 
                  className="button button-primary"
                  onClick={() => setShowWordInput(true)}
                >
                  ➕ Set Words for Round
                </button>
              ) : (
                <form onSubmit={handleSubmitWords} className="word-form">
                  <div className="form-group">
                    <label>Normal Word</label>
                    <input
                      type="text"
                      placeholder="e.g., Pizza"
                      value={normalWord}
                      onChange={(e) => setNormalWord(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Imposter Word</label>
                    <input
                      type="text"
                      placeholder="e.g., Pretzel"
                      value={imposterWord}
                      onChange={(e) => setImposterWord(e.target.value)}
                    />
                  </div>
                  <div className="button-group">
                    <button type="submit" className="button button-success">
                      Start Round
                    </button>
                    <button 
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setShowWordInput(false);
                        setNormalWord('');
                        setImposterWord('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Transfer Role */}
              {room?.users?.length > 1 && (
                <div className="transfer-section">
                  <h4>Transfer Game Master Role</h4>
                  <select 
                    value={selectedUser || ''}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="select-input"
                  >
                    <option value="">Select a player...</option>
                    {room?.users?.map((user) => 
                      user?.id !== socket?.id && (
                        <option key={user?.id} value={user?.id}>
                          {user?.username}
                        </option>
                      )
                    )}
                  </select>
                  <button 
                    className="button button-secondary"
                    onClick={() => selectedUser && handleTransferRole(selectedUser)}
                    disabled={!selectedUser}
                  >
                    Transfer Role
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Waiting Message */}
          {!isGameMaster && (
            <div className="waiting-message">
              <p>⏳ Waiting for Game Master to start the game...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomLobby;
