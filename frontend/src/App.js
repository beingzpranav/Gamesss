import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import UsernameScreen from './components/UsernameScreen';
import MainMenu from './components/MainMenu';
import RoomLobby from './components/RoomLobby';
import GameScreen from './components/GameScreen';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState(null);
  const [screen, setScreen] = useState('username'); // username, menu, lobby, game
  const [roomCode, setRoomCode] = useState(null);
  const [isGameMaster, setIsGameMaster] = useState(false);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const newSocket = io('http://51.21.251.124:4000');
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

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

    socket.on('wordAssigned', (data) => {
      setGameState(prev => ({
        ...prev,
        word: data.word,
        isImposter: data.isImposter,
        roundNumber: data.roundNumber,
        players: data.players
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
    });

    socket.on('votingResults', (data) => {
      setGameState(prev => ({
        ...prev,
        status: 'voting-result',
        votingResults: data,
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
        finalStats: data.finalStats
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
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('userJoined');
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

  const handleUsernameSubmit = (enteredUsername) => {
    setUsername(enteredUsername);
    socket.emit('setUsername', enteredUsername);
    setScreen('menu');
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

  return (
    <div className="App">
      {error && <div className="error-banner">{error}</div>}
      
      {screen === 'username' && (
        <UsernameScreen onSubmit={handleUsernameSubmit} />
      )}

      {screen === 'menu' && (
        <MainMenu 
          username={username}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
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
        />
      )}
    </div>
  );
}

export default App;
