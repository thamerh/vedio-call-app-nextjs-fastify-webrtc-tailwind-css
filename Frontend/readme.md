# WebRTC Chat Application

A real-time chat application with video calling capabilities built with Next.js, Fastify, Socket.IO, and WebRTC.

## Features

- **Real-time messaging** - Instant chat messages across users
- **Video calls** - One-on-one and group video calls
- **Audio/Video controls** - Mute/unmute and enable/disable video
- **Room management** - Create and join chat rooms
- **User presence** - See who's online in your room
- **Responsive design** - Works on desktop and mobile devices

## Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication
- **WebRTC** - Peer-to-peer video/audio

### Backend
- **Fastify** - Fast Node.js web framework
- **Socket.IO** - WebSocket communication
- **UUID** - Unique identifier generation

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Backend Setup

1. Create a new directory for the backend:
```bash
mkdir webrtc-chat-backend
cd webrtc-chat-backend
```

2. Initialize and install dependencies:
```bash
npm init -y
npm install fastify @fastify/websocket @fastify/cors socket.io uuid
npm install -D nodemon
```

3. Copy the `server.js` file to the backend directory

4. Update `package.json` scripts:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

5. Start the backend server:
```bash
npm run dev
```
The server will run on `http://localhost:8000`

### Frontend Setup

1. Create a new Next.js project:
```bash
npx create-next-app@latest webrtc-chat-frontend --typescript --tailwind --eslint
cd webrtc-chat-frontend
```

2. Install additional dependencies:
```bash
npm install socket.io-client uuid
npm install -D @types/uuid
```

3. Copy all the frontend files to their respective locations:
   - `next.config.js`
   - `tailwind.config.js` 
   - `postcss.config.js`
   - `pages/_app.tsx`
   - `pages/index.tsx`
   - `context/SocketContext.tsx`
   - `hooks/useWebRTC.ts`
   - `styles/globals.css`

4. Create the required directory structure:
```bash
mkdir -p context hooks
```

5. Start the frontend development server:
```bash
npm run dev
```
The app will run on `http://localhost:3000`

## Usage

1. **Start both servers** - Backend on port 8000, frontend on port 3000

2. **Create or join a room**:
   - Enter a username
   - Generate a new room ID or enter an existing one
   - Click "Join Room"

3. **Chat messaging**:
   - Type messages in the input field
   - Press Enter or click Send
   - Messages appear in real-time for all users

4. **Video calling**:
   - Click "Start Video Call" to begin a video session
   - Use the microphone and camera toggle buttons
   - Other users in the room will automatically join the call
   - Click "End Call" to stop the video session

5. **Room management**:
   - See all users currently in the room
   - Leave the room at any time
   - Rooms are automatically cleaned up when empty

## Features Explained

### Real-time Messaging
- Uses Socket.IO for instant message delivery
- Messages are stored in memory on the server
- Automatic scrolling to latest messages

### WebRTC Video Calls
- Direct peer-to-peer video/audio communication
- STUN servers for NAT traversal
- Support for multiple participants
- Audio/video controls (mute, camera toggle)

### Room System
- UUID-based room identification
- Dynamic user management
- Real-time user presence updates
- Automatic cleanup of empty rooms

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

WebRTC requires HTTPS in production environments.

## Production Deployment

### Environment Variables

Create `.env.local` for frontend:
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
```

### Backend Considerations
- Use process.env.PORT for dynamic port assignment
- Configure CORS for your production domain
- Consider using Redis for scaling Socket.IO
- Implement proper logging and error handling

### Frontend Considerations
- Update Socket.IO connection URL
- Configure proper CORS headers
- Optimize bundle size for production

## Troubleshooting

### Common Issues

1. **WebRTC connection fails**:
   - Check if HTTPS is enabled (required for WebRTC)
   - Verify STUN server configuration
   - Check firewall/NAT settings

2. **Socket connection issues**:
   - Ensure backend server is running
   - Check CORS configuration
   - Verify port availability

3. **Video not displaying**:
   - Grant camera/microphone permissions
   - Check browser console for errors
   - Ensure proper video element refs

### Browser Permissions
The application requires camera and microphone permissions for video calls. Users will be prompted to grant these permissions when starting a call.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## License

MIT License - feel free to use this code for your projects!