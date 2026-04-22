# 🎮 Multiplayer Game App

A real-time multiplayer web-based game inspired by Skribble, where one player acts as the "Imposter" while others try to guess the correct word.

## 📋 Features

- **Cool Interface**: Modern, gradient-based UI with smooth animations
- **Username Selection**: Unique usernames like Skribble
- **Create Room**: Set maximum participants and get a unique room code
- **Join Room**: Join existing rooms with room codes
- **Game Master Controls**: 
  - Set normal and imposter words for each round
  - Transfer game master role to other players
  - Start voting rounds
  - End the game
- **Real-time Multiplayer**: Socket.io powered real-time communication
- **Word Assignment**: Random distribution of words to players (1 imposter, rest get normal word)
- **Voting System**: Players vote to eliminate the imposter
- **Game Statistics**: Track game history and results

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or extract the project

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

### Running the App

#### Terminal 1 - Backend Server
```bash
cd backend
npm start
```
The server will run on `http://localhost:4000`

#### Terminal 2 - Frontend Application
```bash
cd frontend
npm start
```
The frontend will run on `http://localhost:3000`

The app will automatically open in your browser.

## 🎮 How to Play

1. **Enter Username**: Start by entering a unique username
2. **Create or Join Room**:
   - Click "Create Room" to set the max participants
   - Click "Join Room" to enter an existing room with a code
3. **Game Lobby**: Wait for all players to join (as Game Master)
4. **Set Words**: Game Master sets the normal word and imposter word
5. **Play Round**: 
   - Players see their assigned word
   - Keep it secret!
6. **Voting**: When ready, Game Master starts voting
7. **Results**: See if the imposter was correctly identified
8. **Next Round or End**: Continue with new words or end the game

## 📁 Project Structure

```
Gamesss/
├── backend/
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML entry point
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # App styles
│   │   ├── index.js       # React DOM render
│   │   ├── index.css      # Global styles
│   │   └── components/
│   │       ├── UsernameScreen.js/css
│   │       ├── MainMenu.js/css
│   │       ├── RoomLobby.js/css
│   │       └── GameScreen.js/css
│   └── package.json       # Frontend dependencies
├── .gitignore
└── README.md
```

## 🔌 Tech Stack

- **Frontend**: React 18, Socket.io Client
- **Backend**: Node.js, Express, Socket.io
- **Styling**: CSS3 with gradients and animations
- **Real-time Communication**: Socket.io

## 🎨 Features Breakdown

### Screens

1. **Username Screen**: Enter your unique username
2. **Main Menu**: Choose to create or join a room
3. **Room Lobby**: Manage players and set game parameters
4. **Game Screen**: Play the game, vote, and see results

### Game States

- `waiting`: Waiting for players to join
- `word-selection`: Game Master setting words
- `in-game`: Game is active, players have their words
- `voting`: Voting phase to eliminate imposter
- `voting-result`: Results of the voting
- `ended`: Game has ended

## 🔧 Customization

You can customize:

- **Colors**: Edit gradient colors in CSS files
- **Game Rules**: Modify word distribution logic in `server.js`
- **Max Players**: Change the participant limits in `MainMenu.js`
- **UI Theme**: Modify styles in component CSS files

## 📝 Game Flow

```
Username → Menu → Create/Join Room → Lobby → Game Start
                      ↓
                 Set Words (GM)
                      ↓
                 Players See Word
                      ↓
                 Voting Phase (GM starts)
                      ↓
                 View Results
                      ↓
            Next Round or End Game
```

## 🐛 Troubleshooting

### Connection Issues
- Ensure backend server is running on port 4000
- Check if frontend can reach `http://localhost:4000`
- Check browser console for errors

### Game Not Starting
- Ensure Game Master sets both normal and imposter words
- All required fields must be filled

### Voting Issues
- Game Master must start voting explicitly
- All players must cast votes

## 🎯 Future Enhancements

- User authentication and profiles
- Persistent game statistics
- Different game modes
- Chat functionality
- Scoring system with leaderboards
- Sound effects and notifications

## 📄 License

This project is open source and available for personal use.

## 👨‍💻 Development

For development, you may want to run both servers with hot-reload:

```bash
# Backend (with nodemon)
cd backend && npm run dev

# Frontend (automatic with react-scripts)
cd frontend && npm start
```

---

**Enjoy the game! 🎮**
