import React, { useState } from 'react';
import './GameScreen.css';

function GameScreen({ 
  username, 
  roomCode, 
  isGameMaster, 
  gameState, 
  onStartVoting,
  onCastVote,
  onEndGame,
  onNextRound
}) {
  const [hasVoted, setHasVoted] = useState(false);

  React.useEffect(() => {
    if (gameState?.status === 'voting-result') {
      setHasVoted(false);
    }
  }, [gameState?.status]);

  const handleVote = (userId) => {
    if (!hasVoted) {
      onCastVote(userId);
      setHasVoted(true);
    }
  };

  if (gameState?.status === 'ended') {
    return (
      <div className="game-screen">
        <div className="game-container">
          <div className="end-screen">
            <h2>🎉 Game Over!</h2>
            <p>Thanks for playing!</p>
            {gameState?.gameHistory && (
              <div className="game-stats">
                <h3>Game Statistics</h3>
                <div className="stats-list">
                  {gameState.gameHistory.map((round, idx) => (
                    <div key={idx} className="stat-item">
                      <span>Round {round.round}: {round.wasImposter ? '✅ Imposter Found!' : '❌ Wrong Elimination'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-screen">
      <div className="game-container">
        {/* Header */}
        <div className="game-header">
          <div>
            <h2>Round {gameState?.roundNumber}</h2>
            <p>Room: {roomCode}</p>
          </div>
          <span className="status-badge">{gameState?.status === 'voting' ? '🗳️ Voting' : '🎮 In Game'}</span>
        </div>

        <div className="game-content">
          {/* Main Game Area */}
          <div className="main-area">
            {gameState?.status === 'in-game' && (
              <div className="word-display">
                <h3>Your Word</h3>
                <div className="word-box">
                  <p>{gameState?.word}</p>
                </div>
                <p className="hint">Keep it secret! ✨</p>
              </div>
            )}

            {gameState?.status === 'voting' && (
              <div className="voting-area">
                {isGameMaster ? (
                  <div className="gm-voting-control">
                    <h3>🎮 Voting in Progress</h3>
                    <p className="voting-subtitle">Players are casting their votes...</p>
                    <div className="voting-status">
                      <p>Waiting for all players to vote</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>Who is the Imposter?</h3>
                    <p className="voting-subtitle">Cast your vote:</p>
                    <div className="voting-buttons">
                      {gameState?.players?.filter(p => !p.isGameMaster).map((player) => (
                        <button
                          key={player.id}
                          className={`vote-button ${hasVoted ? 'disabled' : ''}`}
                          onClick={() => handleVote(player.id)}
                          disabled={hasVoted}
                        >
                          {player.username}
                        </button>
                      ))}
                    </div>
                    {hasVoted && <p className="voted-message">✅ Vote cast!</p>}
                  </>
                )}
              </div>
            )}

            {gameState?.status === 'voting-result' && (
              <div className="results-area">
                <h3>Voting Results</h3>
                <div className="result-box">
                  <p className="eliminated">
                    Eliminated: <strong>{gameState?.votingResults?.eliminatedUser?.username}</strong>
                  </p>
                  {gameState?.votingResults?.isImposter ? (
                    <p className="correct">✅ Correct! They were the IMPOSTER!</p>
                  ) : (
                    <p className="incorrect">❌ Wrong! They were innocent.</p>
                  )}
                  <p className="word-reveal">
                    Normal Word: <strong>{gameState?.votingResults?.correctWord}</strong>
                  </p>
                  <p className="word-reveal">
                    Imposter Word: <strong>{gameState?.votingResults?.imposterWord}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Players & Controls */}
          <div className="sidebar">
            <h4>Players in Room</h4>
            <div className="players-sidebar">
              {gameState?.players?.map((player) => (
                <div key={player.id} className="player-item">
                  <span className="player-status">
                    {player.isGameMaster ? '👑' : '👤'}
                  </span>
                  <span className="player-name">{player.username}</span>
                </div>
              ))}
            </div>

            {isGameMaster && (
              <div className="gm-actions">
                <h4>Game Master</h4>
                {gameState?.status === 'in-game' && (
                  <button
                    className="button button-primary"
                    onClick={onStartVoting}
                  >
                    🗳️ Start Voting
                  </button>
                )}
                
                {gameState?.status === 'voting-result' && (
                  <div className="result-actions">
                    <button
                      className="button button-secondary"
                      onClick={onNextRound}
                    >
                      📝 Next Round
                    </button>
                    <button
                      className="button button-danger"
                      onClick={onEndGame}
                    >
                      🛑 End Game
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameScreen;
