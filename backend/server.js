const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://imposter.pranavk.tech"],
    methods: ["GET", "POST"]
  }
});

// Store rooms and users
const rooms = new Map();
const users = new Map();

// Helper function to get room
function getRoom(roomCode) {
  return rooms.get(roomCode);
}

// Helper function to generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // User joins
  socket.on('setUsername', (username) => {
    users.set(socket.id, {
      id: socket.id,
      username,
      room: null,
      role: 'player'
    });
    console.log(`User ${username} set with socket id ${socket.id}`);
  });

  // Create room
  socket.on('createRoom', (data) => {
    const { maxParticipants } = data;
    const roomCode = generateRoomCode();
    const user = users.get(socket.id);

    if (!user) {
      socket.emit('error', { message: 'Please set a username first' });
      return;
    }

    const room = {
      code: roomCode,
      gameMaster: socket.id,
      maxParticipants,
      users: [socket.id],
      status: 'waiting', // waiting, word-selection, in-game, voting, ended
      normalWord: null,
      imposterWord: null,
      wordAssignments: {},
      currentRound: 0,
      votes: {},
      gameHistory: []
    };

    rooms.set(roomCode, room);
    user.room = roomCode;

    socket.join(roomCode);
    io.to(roomCode).emit('roomCreated', {
      roomCode,
      room: {
        code: room.code,
        maxParticipants: room.maxParticipants,
        users: room.users.map(uid => users.get(uid)),
        gameMaster: room.gameMaster
      }
    });

    socket.emit('roomJoined', {
      roomCode,
      isGameMaster: true,
      room: {
        code: room.code,
        maxParticipants: room.maxParticipants,
        users: room.users.map(uid => users.get(uid)),
        gameMaster: room.gameMaster
      }
    });

    console.log(`Room created: ${roomCode} by ${user.username}`);
  });

  // Join room
  socket.on('joinRoom', (data) => {
    const { roomCode } = data;
    const room = getRoom(roomCode);
    const user = users.get(socket.id);

    if (!user) {
      socket.emit('error', { message: 'Please set a username first' });
      return;
    }

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.users.length >= room.maxParticipants) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.users.push(socket.id);
    user.room = roomCode;

    socket.join(roomCode);

    io.to(roomCode).emit('userJoined', {
      user: {
        id: socket.id,
        username: user.username,
        role: user.role
      },
      users: room.users.map(uid => users.get(uid)),
      gameMaster: room.gameMaster
    });

    socket.emit('roomJoined', {
      roomCode,
      isGameMaster: room.gameMaster === socket.id,
      room: {
        code: room.code,
        maxParticipants: room.maxParticipants,
        users: room.users.map(uid => users.get(uid)),
        gameMaster: room.gameMaster
      }
    });

    console.log(`User ${user.username} joined room ${roomCode}`);
  });

  // Submit words (Game Master)
  socket.on('submitWords', (data) => {
    const { normalWord, imposterWord } = data;
    const user = users.get(socket.id);
    const room = getRoom(user.room);

    if (!room || room.gameMaster !== socket.id) {
      socket.emit('error', { message: 'Only game master can submit words' });
      return;
    }

    room.normalWord = normalWord;
    room.imposterWord = imposterWord;
    room.status = 'word-selection';

    // Assign words randomly (1 imposter, rest normal) - EXCLUDE GAME MASTER
    const players = room.users.filter(uid => uid !== room.gameMaster);
    const wordAssignments = {};
    
    if (players.length > 0) {
      const imposterIndex = Math.floor(Math.random() * players.length);
      
      players.forEach((playerId, index) => {
        if (index === imposterIndex) {
          wordAssignments[playerId] = {
            word: imposterWord,
            isImposter: true
          };
        } else {
          wordAssignments[playerId] = {
            word: normalWord,
            isImposter: false
          };
        }
      });
    }

    room.wordAssignments = wordAssignments;

    // Send words to each player
    room.users.forEach(uid => {
      const assignment = wordAssignments[uid];
      io.to(uid).emit('wordAssigned', {
        word: assignment?.word || null,
        isImposter: assignment?.isImposter || false,
        roundNumber: room.currentRound + 1,
        players: room.users.map(id => ({
          id,
          username: users.get(id)?.username,
          isGameMaster: room.gameMaster === id
        }))
      });
    });

    room.status = 'in-game';
    room.currentRound++;

    io.to(room.code).emit('roundStarted', {
      roundNumber: room.currentRound,
      startingPlayer: room.users[0],
      players: room.users.map(id => ({
        id,
        username: users.get(id)?.username,
        isGameMaster: room.gameMaster === id
      }))
    });

    console.log(`Words submitted for room ${room.code}`);
  });

  // Start voting
  socket.on('startVoting', (data) => {
    const user = users.get(socket.id);
    const room = getRoom(user.room);

    if (!room || room.gameMaster !== socket.id) {
      socket.emit('error', { message: 'Only game master can start voting' });
      return;
    }

    room.status = 'voting';
    room.votes = {};

    io.to(room.code).emit('votingStarted', {
      players: room.users.map(id => ({
        id,
        username: users.get(id)?.username,
        isGameMaster: room.gameMaster === id
      }))
    });

    console.log(`Voting started for room ${room.code}`);
  });

  // Cast vote
  socket.on('castVote', (data) => {
    const { votedUserId } = data;
    const user = users.get(socket.id);
    const room = getRoom(user.room);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Game Master cannot vote
    if (room.gameMaster === socket.id) {
      socket.emit('error', { message: 'Game Master cannot vote' });
      return;
    }

    room.votes[socket.id] = votedUserId;

    // Check if all PLAYERS (excluding Game Master) have voted
    const playerCount = room.users.length - 1; // Exclude Game Master
    const playerVotes = Object.keys(room.votes);
    if (playerVotes.length === playerCount) {
      // Calculate results
      const voteCount = {};
      let maxVotes = 0;
      let eliminatedUser = null;

      playerVotes.forEach(voterId => {
        const votedId = room.votes[voterId];
        voteCount[votedId] = (voteCount[votedId] || 0) + 1;
        if (voteCount[votedId] > maxVotes) {
          maxVotes = voteCount[votedId];
          eliminatedUser = votedId;
        }
      });

      const votedUser = users.get(eliminatedUser);
      const assignment = room.wordAssignments[eliminatedUser];
      const isCorrect = assignment?.isImposter || false;

      io.to(room.code).emit('votingResults', {
        eliminatedUser: {
          id: eliminatedUser,
          username: votedUser?.username
        },
        isImposter: assignment?.isImposter,
        correctWord: room.normalWord,
        imposterWord: room.imposterWord,
        votes: room.votes,
        voteCount
      });

      room.status = 'voting-result';
      room.gameHistory.push({
        round: room.currentRound,
        eliminated: eliminatedUser,
        wasImposter: isCorrect,
        votes: room.votes
      });
    }
  });

  // End game
  socket.on('endGame', (data) => {
    const user = users.get(socket.id);
    const room = getRoom(user.room);

    if (!room || room.gameMaster !== socket.id) {
      socket.emit('error', { message: 'Only game master can end the game' });
      return;
    }

    room.status = 'ended';

    io.to(room.code).emit('gameEnded', {
      gameHistory: room.gameHistory,
      finalStats: room.users.map(uid => ({
        id: uid,
        username: users.get(uid)?.username,
        isGameMaster: room.gameMaster === uid
      }))
    });

    console.log(`Game ended for room ${room.code}`);
  });

  // Next round
  socket.on('nextRound', (data) => {
    const user = users.get(socket.id);
    const room = getRoom(user.room);

    if (!room || room.gameMaster !== socket.id) {
      socket.emit('error', { message: 'Only game master can proceed to next round' });
      return;
    }

    room.status = 'waiting';
    room.votes = {};
    room.wordAssignments = {};

    io.to(room.code).emit('nextRoundReady', {
      roundNumber: room.currentRound + 1,
      players: room.users.map(uid => ({
        id: uid,
        username: users.get(uid)?.username,
        isGameMaster: room.gameMaster === uid
      }))
    });

    console.log(`Ready for next round in room ${room.code}`);
  });

  // Transfer game master role
  socket.on('transferGameMaster', (data) => {
    const { newGameMasterId } = data;
    const user = users.get(socket.id);
    const room = getRoom(user.room);

    if (!room || room.gameMaster !== socket.id) {
      socket.emit('error', { message: 'Only game master can transfer role' });
      return;
    }

    room.gameMaster = newGameMasterId;
    const newGM = users.get(newGameMasterId);

    io.to(room.code).emit('gameMasterChanged', {
      newGameMasterId,
      newGameMasterName: newGM?.username,
      users: room.users.map(uid => ({
        id: uid,
        username: users.get(uid)?.username,
        isGameMaster: room.gameMaster === uid
      }))
    });

    console.log(`Game master transferred in room ${room.code}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const room = getRoom(user.room);
      if (room) {
        room.users = room.users.filter(uid => uid !== socket.id);
        
        // If game master disconnects, transfer role
        if (room.gameMaster === socket.id && room.users.length > 0) {
          room.gameMaster = room.users[0];
        }

        io.to(user.room).emit('userLeft', {
          userId: socket.id,
          username: user.username,
          users: room.users.map(uid => users.get(uid)),
          gameMaster: room.gameMaster,
          message: `${user.username} left the room`
        });

        // Delete room if empty
        if (room.users.length === 0) {
          rooms.delete(user.room);
        }
      }
      users.delete(socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
