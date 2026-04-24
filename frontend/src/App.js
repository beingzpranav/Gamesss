import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import GoogleAuthScreen from './components/GoogleAuthScreen';
import MainMenu from './components/MainMenu';
import RoomLobby from './components/RoomLobby';
import GameScreen from './components/GameScreen';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [screen, setScreen] = useState('auth'); // auth, menu, lobby, game
  const [roomCode, setRoomCode] = useState(null);
  const [isGameMaster, setIsGameMaster] = useState(false);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  // Check for existing auth token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('userId');

    if (storedToken && storedUsername && storedUserId) {
      setAuthToken(storedToken);
      setUsername(storedUsername);
      setScreen('menu');
    }
  }, []);

  // Initialize socket and authenticate
  useEffect(() => {
    if (!authToken) return;

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
    const newSocket = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    // Authenticate on connection
    newSocket.on('connect', () => {
      console.log('Socket connected, authenticating...');
      newSocket.emit('authenticate', {
        token: authToken,
        username
      });
    });

    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });

    // Handle authentication failure
    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (error.message && error.message.includes('Authentication')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        setAuthToken(null);
        setUsername(null);
        setScreen('auth');
        setError('Session expired. Please login again.');
      }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.close();
    };
  }, [authToken, username]);

  useEffect(() => {
    if (!socket) return;

    socket.on('roomCreated', (data) => {
      setRoomCode(data.roomCode);
      setRoom(data.room);
      setScreen('lobby');
    });

    socket.on('roomJoined', (data) => {
      setRoomCode(data.roomCode);
      setIsGameMaster(data.isGameMaster);
      setRoom(data.room);
      setScreen('lobby');
    });

    socket.on('userJoined', (data) => {
      setRoom(prevRoom => ({
        ...prevRoom,
        users: data.users
      }));
    });

    socket.on('userReconnected', (data) => {
      setError(`${data.username} reconnected`);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('wordAssigned', (data) => {
      setGameState(prev => ({
        ...prev,
        word: data.word,
        isImposter: data.isImposter,
        roundNumber: data.roundNumber,
        players: data.players,
        status: 'in-game'
      }));
      setScreen('game');
    });

    socket.on('roundStarted', (data) => {
      setGameState(prev => ({
        ...prev,
        roundNumber: data.roundNumber,
        startingPlayer: data.startingPlayer,
        players: data.players,
        status: 'in-game'
      }));
    });

    socket.on('votingStarted', (data) => {
      setGameState(prev => ({
        ...prev,
        status: 'voting',
        players: data.players,
        votes: {}
      }));
      setScreen('game');
    });

    socket.on('votingResults', (data) => {
      setGameState(prev => ({
        ...prev,
        status: 'voting-result',
        votingResults: data,
        points: data.points,
        votes: {}
      }));
      // Auto reset vote status for next voting round
      setTimeout(() => {
        // State is ready for next round
      }, 3000);
    });

    socket.on('gameMasterChanged', (data) => {
      setIsGameMaster(data.newGameMasterId === socket.id);
      setRoom(prevRoom => ({
        ...prevRoom,
        users: data.users,
        gameMaster: data.newGameMasterId
      }));
      if (data.reason === 'Previous GM disconnected') {
        setError(`${data.newGameMasterName} is now Game Master`);
        setTimeout(() => setError(null), 3000);
      }
    });

    socket.on('userLeft', (data) => {
      setRoom(prevRoom => ({
        ...prevRoom,
        users: data.users,
        gameMaster: data.gameMaster
      }));
    });

    socket.on('gameEnded', (data) => {
      setGameState(prev => ({
        ...prev,
        status: 'ended',
        gameHistory: data.gameHistory,
        finalStats: data.finalStats,
        points: data.points
      }));
    });

    socket.on('nextRoundReady', (data) => {
      setScreen('lobby');
      setGameState(null);
      setRoom(prevRoom => ({
        ...prevRoom,
        users: data.players
      }));
    });

    socket.on('error', (data) => {
      setError(data.message);
      
      // Redirect to login for authentication errors
      if (data.message && (data.message.includes('Session not found') || data.message.includes('Invalid or expired token'))) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        setAuthToken(null);
        setUsername(null);
        setScreen('auth');
        setTimeout(() => setError(null), 3000);
      } else {
        setTimeout(() => setError(null), 3000);
      }
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('userJoined');
      socket.off('userReconnected');
      socket.off('wordAssigned');
      socket.off('roundStarted');
      socket.off('votingStarted');
      socket.off('votingResults');
      socket.off('nextRoundReady');
      socket.off('gameMasterChanged');
      socket.off('userLeft');
      socket.off('gameEnded');
      socket.off('error');
    };
  }, [socket]);

  const handleAuthSuccess = (authData) => {
    setAuthToken(authData.token);
    setUsername(authData.username);
    localStorage.setItem('userId', authData.userId);
    setScreen('menu');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setAuthToken(null);
    setUsername(null);
    setScreen('auth');
    if (socket) socket.close();
  };

  const handleCreateRoom = (maxParticipants) => {
    socket.emit('createRoom', { maxParticipants });
  };

  const handleJoinRoom = (code) => {
    socket.emit('joinRoom', { roomCode: code });
  };

  const handleSubmitWords = (normalWord, imposterWord) => {
    socket.emit('submitWords', { normalWord, imposterWord });
  };

  const handleStartVoting = () => {
    socket.emit('startVoting', {});
  };

  const handleCastVote = (votedUserId) => {
    socket.emit('castVote', { votedUserId });
  };

  const handleTransferGameMaster = (newGameMasterId) => {
    socket.emit('transferGameMaster', { newGameMasterId });
  };

  const handleEndGame = () => {
    socket.emit('endGame', {});
  };

  const handleNextRound = () => {
    socket.emit('nextRound', {});
  };

  const handleBackToMenu = () => {
    setScreen('menu');
    setRoomCode(null);
    setRoom(null);
    setGameState(null);
    setIsGameMaster(false);
  };

  const handleGoHome = () => {
    setScreen('menu');
    setRoomCode(null);
    setRoom(null);
    setGameState(null);
    setIsGameMaster(false);
  };

  return (
    <div className="App">
      {error && <div className="error-banner">{error}</div>}
      
      {screen === 'auth' && (
        <GoogleAuthScreen onAuthSuccess={handleAuthSuccess} />
      )}

      {screen === 'menu' && (
        <MainMenu 
          username={username}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLogout={handleLogout}
        />
      )}

      {screen === 'lobby' && (
        <RoomLobby
          roomCode={roomCode}
          room={room}
          username={username}
          isGameMaster={isGameMaster}
          socket={socket}
          onSubmitWords={handleSubmitWords}
          onTransferGameMaster={handleTransferGameMaster}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          username={username}
          roomCode={roomCode}
          isGameMaster={isGameMaster}
          gameState={gameState}
          onStartVoting={handleStartVoting}
          onCastVote={handleCastVote}
          onEndGame={handleEndGame}
          onNextRound={handleNextRound}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  );
}

export default App;
