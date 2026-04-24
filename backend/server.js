const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://imposter.pranavk.tech",
      process.env.FRONTEND_URL || ""
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Store rooms, users, and sessions
const rooms = new Map();
const users = new Map(); // socket.id -> user
const userSessions = new Map(); // userId -> { token, socketIds[], lastActivity }
const socketToUser = new Map(); // socket.id -> userId

// Helper function to get room
function getRoom(roomCode) {
  return rooms.get(roomCode);
}

// Helper function to generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateToken(userId, username) {
  return jwt.sign(
    { userId, username, iat: Date.now() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// REST API endpoints

// Google OAuth verification
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken, username } = req.body;

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const userId = payload.sub; // Google unique ID
    const email = payload.email;

    // Generate JWT for session
    const token = generateToken(userId, username);

    // Store session
    if (!userSessions.has(userId)) {
      userSessions.set(userId, {
        token,
        email,
        username,
        socketIds: [],
        lastActivity: Date.now()
      });
    } else {
      const session = userSessions.get(userId);
      session.token = token;
      session.username = username;
      session.lastActivity = Date.now();
    }

    res.json({
      success: true,
      token,
      userId,
      username
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
});

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Authenticate user on connect
  socket.on('authenticate', (data) => {
    const { token, username } = data;
    const decoded = verifyToken(token);

    if (!decoded) {
      socket.emit('error', { message: 'Invalid or expired token' });
      socket.disconnect();
      return;
    }

    const userId = decoded.userId;
    const session = userSessions.get(userId);

    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      socket.disconnect();
      return;
    }

    // Register socket to user
    socketToUser.set(socket.id, userId);
    session.socketIds.push(socket.id);
    session.lastActivity = Date.now();

    // Create/update user object
    users.set(socket.id, {
      id: socket.id,
      userId,
      username: session.username,
      room: null,
      role: 'player'
    });

    socket.emit('authenticated', {
      success: true,
      userId,
      username: session.username
    });

    console.log(`User authenticated: ${session.username} (${userId})`);

    // Notify about reconnection if user was in a room
    const roomCode = Array.from(rooms.values()).find(room => {
      return room.userSessions?.some(s => s.userId === userId);
    })?.code;

    if (roomCode) {
      const room = getRoom(roomCode);
      if (room) {
        // Just join the socket.io room, don't add to room.users yet
        // joinRoom handler will add the socket when called
        socket.join(roomCode);

        // Resync game state to reconnected player
        if (room.status === 'voting') {
          // Send voting state
          socket.emit('votingStarted', {
            players: room.users.map(id => ({
              id,
              username: users.get(id)?.username,
              isGameMaster: room.gameMaster === id
            }))
          });
        } else if (room.status === 'voting-result') {
          // Send voting results
          const eliminatedUserData = room.gameHistory[room.gameHistory.length - 1];
          socket.emit('votingResults', {
            eliminatedUser: eliminatedUserData?.eliminatedUser,
            isImposter: eliminatedUserData?.wasImposter,
            correctWord: room.normalWord,
            imposterWord: room.imposterWord,
            votes: room.votes,
            voteCount: {},
            points: room.points
          });
        } else if (room.status === 'word-selection') {
          // Send word assignment to player if they haven't received it
          const assignment = room.wordAssignments[socket.id];
          if (assignment) {
            socket.emit('wordAssigned', {
              word: assignment.word,
              isImposter: assignment.isImposter,
              roundNumber: room.currentRound + 1,
              players: room.users.map(id => ({
                id,
                username: users.get(id)?.username,
                isGameMaster: room.gameMaster === id
              }))
            });
          }
        } else if (room.status === 'in-game') {
          // Send game state to player who reconnected during guessing phase
          const assignment = room.wordAssignments[socket.id];
          socket.emit('wordAssigned', {
            word: assignment?.word || null,
            isImposter: assignment?.isImposter || false,
            roundNumber: room.currentRound,
            players: room.users.map(id => ({
              id,
              username: users.get(id)?.username,
              isGameMaster: room.gameMaster === id
            }))
          });
        }

        io.to(roomCode).emit('userReconnected', {
          userId,
          username: session.username,
          message: `${session.username} reconnected`
        });
      }
    }
  });

  // User sets username (legacy support)
  socket.on('setUsername', (username) => {
    const user = users.get(socket.id);
    if (user) {
      user.username = username;
      console.log(`User ${username} set with socket id ${socket.id}`);
    }
  });

  // Create room
  socket.on('createRoom', (data) => {
    const { maxParticipants } = data;
    const roomCode = generateRoomCode();
    const user = users.get(socket.id);
    const userId = socketToUser.get(socket.id);

    if (!user) {
      socket.emit('error', { message: 'Please authenticate first' });
      return;
    }

    const room = {
      code: roomCode,
      gameMaster: socket.id,
      gameMasterId: userId,
      maxParticipants,
      users: [socket.id],
      userSessions: [{ userId, username: user.username, socketIds: [socket.id] }],
      status: 'waiting',
      normalWord: null,
      imposterWord: null,
      wordAssignments: {},
      currentRound: 0,
      votes: {},
      votingLocked: false,
      votingTimer: null,
      points: { [socket.id]: 0 },
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
    const userId = socketToUser.get(socket.id);

    if (!user) {
      socket.emit('error', { message: 'Please authenticate first' });
      return;
    }

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.users.length >= room.maxParticipants && !room.userSessions.some(s => s.userId === userId)) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Check if user already in room (reconnection)
    const existingSession = room.userSessions.find(s => s.userId === userId);
    if (existingSession) {
      // Only add socket if not already in room.users (prevent duplicates)
      if (!room.users.includes(socket.id)) {
        room.users.push(socket.id);
      }
      if (!existingSession.socketIds.includes(socket.id)) {
        existingSession.socketIds.push(socket.id);
      }
    } else {
      // New user joining
      if (!room.users.includes(socket.id)) {
        room.users.push(socket.id);
      }
      room.userSessions.push({ userId, username: user.username, socketIds: [socket.id] });
      // Initialize points for new player if not already initialized
      if (!room.points[socket.id]) {
        room.points[socket.id] = 0;
      }
    }

    user.room = roomCode;
    socket.join(roomCode);

    io.to(roomCode).emit('userJoined', {
      user: {
        id: socket.id,
        userId,
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
    room.votingLocked = false;
    room.votes = {};

    // Check if there are any active players (non-GM) who can vote
    const activePlayers = room.users.filter(uid => uid !== room.gameMaster && users.has(uid));

    // If no active players to vote, immediately complete voting
    if (activePlayers.length === 0) {
      console.log(`No active players to vote in room ${room.code}, auto-completing voting`);
      completeVoting(room);
      return;
    }

    // Set 30-second voting timeout
    if (room.votingTimer) {
      clearTimeout(room.votingTimer);
    }
    room.votingTimer = setTimeout(() => {
      if (room && room.status === 'voting' && !room.votingLocked) {
        console.log(`Voting timeout reached for room ${room.code}`);
        completeVoting(room);
      }
    }, 30000); // 30 seconds

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

    // Check if voting is still active (not locked)
    if (room.status !== 'voting' || room.votingLocked) {
      socket.emit('error', { message: 'Voting is not active' });
      return;
    }

    // Game Master cannot vote
    if (room.gameMaster === socket.id) {
      socket.emit('error', { message: 'Game Master cannot vote' });
      return;
    }

    // Check if player is still in room
    if (!room.users.includes(socket.id)) {
      socket.emit('error', { message: 'You are not in this room' });
      return;
    }

    room.votes[socket.id] = votedUserId;

    // Get active players (excluding GM, excluding disconnected users)
    const activePlayers = room.users.filter(uid => uid !== room.gameMaster && users.has(uid));
    const playersWhoVoted = Object.keys(room.votes).filter(voterId => activePlayers.includes(voterId));
    
    console.log(`Vote cast in ${room.code}: ${playersWhoVoted.length}/${activePlayers.length} players voted`);

    // Check if all active players have voted
    if (playersWhoVoted.length === activePlayers.length && activePlayers.length > 0) {
      completeVoting(room);
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

    // Clear voting timer if exists
    if (room.votingTimer) {
      clearTimeout(room.votingTimer);
      room.votingTimer = null;
    }

    room.status = 'ended';

    io.to(room.code).emit('gameEnded', {
      gameHistory: room.gameHistory,
      finalStats: room.users.map(uid => ({
        id: uid,
        username: users.get(uid)?.username,
        isGameMaster: room.gameMaster === uid
      })),
      points: room.points
    });

    console.log(`Game ended for room ${room.code}`);
  });

  // Helper function to complete voting
  function completeVoting(room) {
    // Clear voting timer if exists
    if (room.votingTimer) {
      clearTimeout(room.votingTimer);
      room.votingTimer = null;
    }

    // Lock voting to prevent new votes
    room.votingLocked = true;

    // Calculate results from active votes only
    const voteCount = {};
    let maxVotes = 0;
    let eliminatedUser = null;

    Object.entries(room.votes).forEach(([voterId, votedId]) => {
      voteCount[votedId] = (voteCount[votedId] || 0) + 1;
      if (voteCount[votedId] > maxVotes) {
        maxVotes = voteCount[votedId];
        eliminatedUser = votedId;
      }
    });

    const votedUser = users.get(eliminatedUser);
    const assignment = room.wordAssignments[eliminatedUser];
    const isCorrect = assignment?.isImposter || false;

    // Award points based on voting outcome
    // If imposter was voted out: non-GM non-imposter players get 1 point
    // If imposter won: imposter gets 1 point
    if (isCorrect) {
      // Imposter was voted out - reward non-imposter, non-GM players
      room.users.forEach(uid => {
        if (uid !== room.gameMaster && uid !== eliminatedUser) {
          room.points[uid] = (room.points[uid] || 0) + 1;
        }
      });
    } else {
      // Imposter was not voted out - find who the imposter is and reward them
      const imposterSocketId = Object.keys(room.wordAssignments).find(
        uid => room.wordAssignments[uid].isImposter
      );
      if (imposterSocketId) {
        room.points[imposterSocketId] = (room.points[imposterSocketId] || 0) + 1;
      }
    }

    io.to(room.code).emit('votingResults', {
      eliminatedUser: {
        id: eliminatedUser,
        username: votedUser?.username
      },
      isImposter: assignment?.isImposter,
      correctWord: room.normalWord,
      imposterWord: room.imposterWord,
      votes: room.votes,
      voteCount,
      points: room.points
    });

    room.status = 'voting-result';
    room.gameHistory.push({
      round: room.currentRound,
      eliminated: eliminatedUser,
      wasImposter: isCorrect,
      votes: room.votes,
      points: { ...room.points }
    });

    console.log(`Voting completed for room ${room.code}`);
  }

  // Next round
  socket.on('nextRound', (data) => {
    const user = users.get(socket.id);
    const room = getRoom(user.room);

    if (!room || room.gameMaster !== socket.id) {
      socket.emit('error', { message: 'Only game master can proceed to next round' });
      return;
    }

    // Clear voting timer if exists (defensive cleanup)
    if (room.votingTimer) {
      clearTimeout(room.votingTimer);
      room.votingTimer = null;
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
    const userId = socketToUser.get(socket.id);
    const user = users.get(socket.id);

    if (user && userId) {
      const room = getRoom(user.room);
      if (room) {
        room.users = room.users.filter(uid => uid !== socket.id);

        // Clean up votes from disconnected player
        if (room.votes[socket.id]) {
          delete room.votes[socket.id];
        }

        // Remove disconnected socket from user session
        const userSession = room.userSessions.find(s => s.userId === userId);
        if (userSession) {
          userSession.socketIds = userSession.socketIds.filter(sid => sid !== socket.id);
          // Remove user session if no more sockets
          if (userSession.socketIds.length === 0) {
            room.userSessions = room.userSessions.filter(s => s.userId !== userId);
          }
        }

        // Auto-promote GM if disconnected (promote to oldest active user)
        if (room.gameMaster === socket.id && room.users.length > 0) {
          room.gameMaster = room.users[0];
          const newGM = users.get(room.users[0]);
          room.gameMasterId = socketToUser.get(room.users[0]);

          io.to(user.room).emit('gameMasterChanged', {
            newGameMasterId: room.users[0],
            newGameMasterName: newGM?.username,
            reason: 'Previous GM disconnected',
            users: room.users.map(uid => users.get(uid))
          });
        }

        io.to(user.room).emit('userLeft', {
          userId,
          username: user.username,
          users: room.users.map(uid => users.get(uid)),
          gameMaster: room.gameMaster,
          message: `${user.username} left the room`
        });

        // If voting is in progress, check if we should auto-complete
        if (room.status === 'voting' && !room.votingLocked) {
          const activePlayers = room.users.filter(uid => uid !== room.gameMaster && users.has(uid));
          const playersWhoVoted = Object.keys(room.votes).filter(voterId => activePlayers.includes(voterId));
          
          // Auto-complete if all active players voted, or if no active players remain (only GM left)
          if (playersWhoVoted.length === activePlayers.length && (activePlayers.length > 0 || activePlayers.length === 0)) {
            completeVoting(room);
          }
        }

        // Delete room if empty
        if (room.users.length === 0) {
          rooms.delete(user.room);
        }
      }
      users.delete(socket.id);
    }

    // Clean up user mapping
    socketToUser.delete(socket.id);

    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
