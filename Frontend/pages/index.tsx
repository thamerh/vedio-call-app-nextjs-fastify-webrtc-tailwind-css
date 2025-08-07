import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  username: string;
  joinedAt: Date;
}

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  userId: string;
}

const ChatApp: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  const {
    isCallActive,
    localStream,
    remoteStreams,
    isMuted,
    isVideoEnabled,
    startCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTC(socket, localVideoRef);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-joined', (data) => {
      setUsers(data.users);
      setMessages(data.messages);
      setIsInRoom(true);
    });

    socket.on('user-joined', (data) => {
      setUsers(data.users);
    });

    socket.on('user-left', (data) => {
      setUsers(data.users);
    });

    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('new-message');
    };
  }, [socket]);

  const joinRoom = () => {
    if (!socket || !username.trim() || !roomId.trim()) return;
    
    socket.emit('join-room', {
      roomId: roomId,
      username: username,
      isVideoCall: false
    });
  };

  const createRoom = () => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
  };

  const sendMessage = () => {
    if (!socket || !messageInput.trim()) return;

    socket.emit('send-message', {
      message: messageInput
    });

    setMessageInput('');
  };

  const handleVideoCallStart = async () => {
    setShowVideoCall(true);
    await startCall();
  };

  const handleVideoCallEnd = () => {
    endCall();
    setShowVideoCall(false);
  };

  const leaveRoom = () => {
    if (isCallActive) {
      handleVideoCallEnd();
    }
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    setIsInRoom(false);
    setMessages([]);
    setUsers([]);
    setRoomId('');
    setShowVideoCall(false);
  };

  if (!isInRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md border border-gray-200">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 2v5c0 1.1.9 2 2 2h5V2h-7zM11 2H2v20h20v-9h-7c-1.1 0-2-.9-2-2V2z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Meeting</h1>
            <p className="text-gray-500">Connect with your team instantly</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Display Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Meeting ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="Enter meeting ID"
                />
                <button
                  onClick={createRoom}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
                >
                  New
                </button>
              </div>
            </div>
            
            <button
              onClick={joinRoom}
              disabled={!username.trim() || !roomId.trim() || !isConnected}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg"
            >
              {isConnected ? 'Join Meeting' : 'Connecting...'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Main Video Area */}
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 2v5c0 1.1.9 2 2 2h5V2h-7zM11 2H2v20h20v-9h-7c-1.1 0-2-.9-2-2V2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Meeting Room</h1>
              <p className="text-gray-400 text-sm">ID: {roomId}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm">{users.length} participants</span>
            </div>
            
            <button
              onClick={leaveRoom}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-6 relative">
          {showVideoCall ? (
            <div className="h-full">
              {/* Main video area - Remote participants only */}
              <div className="grid gap-4 h-full">
                {remoteStreams.size === 0 ? (
                  /* No remote participants - show waiting message */
                  <div className="relative rounded-2xl overflow-hidden bg-gray-800 shadow-2xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.973 3.973 0 0 0 16.02 6c-.8 0-1.54.31-2.09.81l-.91.91C12.7 8.04 12.37 8 12 8s-.7.04-1.02.16l-.91-.91A2.92 2.92 0 0 0 7.98 6c-.8 0-1.54.31-2.09.81L3.35 9.35A.996.996 0 1 0 4.76 10.76l2.54-2.54c.4-.4.85-.47 1.31-.35L10.5 16H8v6h2v-6h4v6h2z"/>
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-300 mb-2">Waiting for others to join</h3>
                      <p className="text-gray-400">Invite others to start the meeting</p>
                    </div>
                  </div>
                ) : (
                  /* Remote participants grid */
                  <div className={`grid gap-4 h-full ${
                    remoteStreams.size === 1 
                      ? 'grid-cols-1' 
                      : remoteStreams.size <= 4 
                        ? 'grid-cols-2 grid-rows-2' 
                        : 'grid-cols-3 grid-rows-2'
                  }`}>
                    {/* Remote videos only */}
                    {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                      const remoteUser = users.find(u => u.id === userId);
                      return (
                        <div key={userId} className="relative rounded-2xl overflow-hidden bg-gray-800 shadow-xl">
                          <video
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            ref={(video) => {
                              if (video) video.srcObject = stream;
                            }}
                          />
                          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-medium">
                            {remoteUser?.username || 'Unknown User'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture - Your video in top right corner */}
              <div className="absolute top-6 right-6 w-64 h-64 rounded-2xl overflow-hidden bg-gray-800 shadow-2xl border-2 border-gray-600 z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                  You
                </div>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-300">{username.charAt(0).toUpperCase()}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{username}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No video call - waiting room */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-4xl font-bold">{username.charAt(0).toUpperCase()}</span>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Ready to join?</h2>
                <p className="text-gray-400 mb-8">Start your video to begin the meeting</p>
                <button
                  onClick={handleVideoCallStart}
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg"
                >
                  Start Video
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
          <div className="flex items-center justify-center space-x-4">
            {isCallActive && (
              <>
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm5.3 8.3c-.7 0-1.3.6-1.3 1.3 0 3-2.4 5.1-5.1 5.1S5.8 14.6 5.8 11.6c0-.7-.6-1.3-1.3-1.3s-1.3.6-1.3 1.3c0 3.7 2.8 6.9 6.3 7.3v3.4h-2.2c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3h6.6c.7 0 1.3-.6 1.3-1.3s-.6-1.3-1.3-1.3h-2.2v-3.4c3.5-.4 6.3-3.6 6.3-7.3 0-.7-.6-1.3-1.3-1.3z"/>
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    !isVideoEnabled 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
                >
                  {isVideoEnabled ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l-3.28-3.28c.46-.42 1.06-.72 1.73-.72H16c.55 0 1 .45 1 1v3.5l4-4v11zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleVideoCallEnd}
                  className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
                  title="End Call"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.69.28-.26 0-.51-.1-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.44.29-.71.29-.26 0-.51-.1-.69-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                  </svg>
                </button>
              </>
            )}

            <button
              onClick={() => setShowChat(!showChat)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Chat"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </button>

            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                showParticipants ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Participants"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.973 3.973 0 0 0 16.02 6c-.8 0-1.54.31-2.09.81l-.91.91C12.7 8.04 12.37 8 12 8s-.7.04-1.02.16l-.91-.91A2.92 2.92 0 0 0 7.98 6c-.8 0-1.54.31-2.09.81L3.35 9.35A.996.996 0 1 0 4.76 10.76l2.54-2.54c.4-.4.85-.47 1.31-.35L10.5 16H8v6h2v-6h4v6h2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="absolute top-0 right-0 w-80 h-full bg-white text-gray-900 shadow-2xl z-50 border-l border-gray-200">
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">
                          {message.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {message.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 break-words">
                          {message.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="absolute top-0 right-0 w-80 h-full bg-white text-gray-900 shadow-2xl z-50 border-l border-gray-200">
          <div className="flex flex-col h-full">
            {/* Participants Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold">Participants ({users.length})</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Participants List */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {user.username}
                          {user.id === socket?.id && ' (You)'}
                        </span>
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(user.joinedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;