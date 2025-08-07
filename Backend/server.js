const fastify = require('fastify')({ 
    logger: true,
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true
    }
  });
  const { v4: uuidv4 } = require('uuid');
  
  // Register CORS
  fastify.register(require('@fastify/cors'));
  
  // In-memory storage for rooms and users
  const rooms = new Map();
  const users = new Map();
  
  // Socket.IO setup
  const io = require('socket.io')(fastify.server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"]
    }
  });
  
  // WebRTC signaling and chat logic
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // User joins a room
    socket.on('join-room', (data) => {
      const { roomId, username, isVideoCall } = data;
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          users: new Map(),
          messages: [],
          isVideoCall: isVideoCall || false
        });
      }
      
      const room = rooms.get(roomId);
      room.users.set(socket.id, {
        id: socket.id,
        username: username,
        joinedAt: new Date()
      });
      
      users.set(socket.id, { roomId, username });
      
      socket.join(roomId);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userId: socket.id,
        username: username,
        users: Array.from(room.users.values())
      });
      
      // Send room info to the joining user
      socket.emit('room-joined', {
        roomId: roomId,
        users: Array.from(room.users.values()),
        messages: room.messages,
        isVideoCall: room.isVideoCall
      });
      
      console.log(`User ${username} joined room ${roomId}`);
    });
    
    // Handle chat messages
    socket.on('send-message', (data) => {
      const user = users.get(socket.id);
      if (!user) return;
      
      const { message } = data;
      const room = rooms.get(user.roomId);
      
      if (room) {
        const messageData = {
          id: uuidv4(),
          username: user.username,
          message: message,
          timestamp: new Date(),
          userId: socket.id
        };
        
        room.messages.push(messageData);
        
        // Broadcast to all users in the room
        io.to(user.roomId).emit('new-message', messageData);
      }
    });
    
    // WebRTC signaling for video calls
    socket.on('webrtc-offer', (data) => {
      const { targetUserId, offer } = data;
      socket.to(targetUserId).emit('webrtc-offer', {
        offer: offer,
        fromUserId: socket.id
      });
    });
    
    socket.on('webrtc-answer', (data) => {
      const { targetUserId, answer } = data;
      socket.to(targetUserId).emit('webrtc-answer', {
        answer: answer,
        fromUserId: socket.id
      });
    });
    
    socket.on('webrtc-ice-candidate', (data) => {
      const { targetUserId, candidate } = data;
      socket.to(targetUserId).emit('webrtc-ice-candidate', {
        candidate: candidate,
        fromUserId: socket.id
      });
    });
    
    // Handle video call start/end
    socket.on('start-video-call', () => {
      const user = users.get(socket.id);
      if (!user) return;
      
      socket.to(user.roomId).emit('video-call-started', {
        initiatorId: socket.id,
        username: user.username
      });
    });
    
    socket.on('end-video-call', () => {
      const user = users.get(socket.id);
      if (!user) return;
      
      socket.to(user.roomId).emit('video-call-ended', {
        userId: socket.id
      });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      
      if (user) {
        const room = rooms.get(user.roomId);
        if (room) {
          room.users.delete(socket.id);
          
          // If room is empty, clean it up
          if (room.users.size === 0) {
            rooms.delete(user.roomId);
          } else {
            // Notify others that user left
            socket.to(user.roomId).emit('user-left', {
              userId: socket.id,
              username: user.username,
              users: Array.from(room.users.values())
            });
          }
        }
        
        users.delete(socket.id);
      }
      
      console.log(`User disconnected: ${socket.id}`);
    });
  });
  
  // REST API endpoints
  fastify.get('/api/rooms', async (request, reply) => {
    const roomList = Array.from(rooms.values()).map(room => ({
      id: room.id,
      userCount: room.users.size,
      isVideoCall: room.isVideoCall,
      users: Array.from(room.users.values()).map(user => ({
        username: user.username,
        joinedAt: user.joinedAt
      }))
    }));
    
    return { rooms: roomList };
  });
  
  fastify.post('/api/create-room', async (request, reply) => {
    const roomId = uuidv4();
    return { roomId };
  });
  
  // Start server
  const start = async () => {
    try {
      await fastify.listen({ port: 8000, host: '0.0.0.0' });
      console.log('Server running on http://localhost:8000');
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  };
  
  start();