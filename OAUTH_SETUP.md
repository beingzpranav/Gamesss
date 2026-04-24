# Google OAuth Implementation Guide

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

This will install:
- `jsonwebtoken` - for JWT token generation
- `google-auth-library` - for verifying Google ID tokens
- `dotenv` - for environment variables

### 2. Set Environment Variables

Create a `.env` file in the `backend` directory:

```env
JWT_SECRET=your-super-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=development
```

### 3. Get Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Select **Web Application**
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://your-vercel-domain.vercel.app` (production)
6. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://your-vercel-domain.vercel.app` (production)
7. Copy the **Client ID** and paste in `.env`

### 4. Backend Features

**New Endpoints:**
- `POST /api/auth/google` - Verify Google token and generate JWT

**Socket Events (New):**
- `authenticate` - Authenticate user with JWT token
- `userReconnected` - Broadcast when user reconnects

**Socket Events (Updated):**
- All existing events now support multi-socket reconnections per user

**Auto Features:**
- Auto-promotion of Game Master when current GM disconnects
- Session persistence across browser refreshes
- Multi-tab support (user can have multiple sockets connected)

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

This will install:
- `@react-oauth/google` - Google OAuth login button

### 2. Set Environment Variables

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_BACKEND_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Update App.js

Your `App.js` now needs to:
1. Check for stored auth token on mount
2. Authenticate on Socket.IO connection
3. Handle reconnection automatically
4. Show GoogleAuthScreen instead of UsernameScreen

Example flow:
```
User Opens App
    ↓
Check localStorage for token
    ↓
If token exists → Authenticate with backend
    ↓
If no token → Show GoogleAuthScreen
    ↓
User logs in with Google
    ↓
Backend verifies token and returns JWT
    ↓
Frontend stores JWT and connects to Socket.IO
    ↓
Socket authenticates with JWT
    ↓
User enters MainMenu
```

### 4. Reconnection Flow

**When Internet Drops:**
1. Socket automatically tries to reconnect
2. On reconnection, socket sends the stored JWT token
3. Backend verifies token and restores user session
4. User gets `userReconnected` broadcast
5. If in a room → user can continue playing
6. If GM disconnected → new GM auto-promoted

---

## Testing Locally

### Terminal 1 - Backend
```bash
cd backend
npm install
npm start
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm start
```

### Browser
1. Open `http://localhost:3000`
2. Sign in with Google (or test account)
3. Create/Join a room
4. Test disconnect by:
   - Closing tab
   - Losing internet connection
   - Refreshing page
5. Reconnect and verify you're back in the game

---

## Deployment

### Backend (EC2)

1. Update `.env` in EC2:
```env
JWT_SECRET=very-secure-random-string
GOOGLE_CLIENT_ID=your-prod-google-client-id
FRONTEND_URL=https://your-vercel-domain.vercel.app
PORT=4000
NODE_ENV=production
```

2. Deploy as before with PM2

### Frontend (Vercel)

1. Set environment variables in Vercel dashboard:
   - `REACT_APP_BACKEND_URL` = `http://your-ec2-ip:4000`
   - `REACT_APP_GOOGLE_CLIENT_ID` = your Google Client ID

2. Add authorized URIs in Google Console (production domain)

3. Push to GitHub → Vercel auto-deploys

---

## Key Features

✅ **Google OAuth Login** - Secure authentication with Google accounts
✅ **JWT Tokens** - 7-day session tokens stored in localStorage
✅ **Auto-Reconnection** - Players can rejoin mid-game if disconnected
✅ **Multi-Tab Support** - Same user can play from multiple tabs
✅ **Auto GM Failover** - New GM promoted when current one disconnects
✅ **Session Persistence** - Survives browser refresh
✅ **Network Recovery** - Automatic socket reconnection on internet restore

---

## Troubleshooting

### "Authentication failed"
- Check Google Client ID in `.env`
- Verify backend is running
- Check CORS settings

### "Invalid or expired token"
- Clear localStorage
- Logout and login again
- Check JWT_SECRET hasn't changed

### "Socket disconnect but can't reconnect"
- Check internet connection
- Verify backend is running
- Check backend logs: `pm2 logs game-server`

### "GM didn't auto-promote"
- Check there are other players in room
- Verify socket disconnect event fired
- Check server logs

---

## Security Notes

⚠️ **Before Production:**
1. Change `JWT_SECRET` to a strong random string
2. Add `HTTPS_ONLY` mode
3. Set `NODE_ENV=production`
4. Keep Google Client ID private
5. Use strong CORS origins (not `*`)
6. Enable rate limiting on `/api/auth/google`

