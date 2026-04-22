# GitHub Copilot Instructions

This is a multiplayer web-based game application project.

## Project Overview

- **Type**: Full-stack web application
- **Frontend**: React 18 with Socket.io
- **Backend**: Node.js + Express with Socket.io
- **Architecture**: Real-time multiplayer game with WebSocket communication

## Key Technologies

- Socket.io for real-time bidirectional communication
- React hooks for state management
- CSS3 for modern UI with gradients and animations
- UUID for unique room code generation

## Development Guidelines

1. **Backend**: All game logic and room management in `server.js`
2. **Frontend**: Component-based architecture with separate screens
3. **Styling**: CSS modules for component-specific styles
4. **Real-time**: Socket.io events for synchronizing game state across clients

## Common Tasks

- To run the app: See README.md for startup instructions
- To modify game rules: Update `server.js` socket event handlers
- To customize UI: Edit component CSS files
- To add features: Create new socket events in backend and corresponding handlers in frontend

## Port Configuration

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:3000`
- CORS enabled for local development

## Testing

Manual testing recommended:
1. Create room with multiple clients
2. Test voting flow
3. Verify word assignment randomization
4. Check game master controls
