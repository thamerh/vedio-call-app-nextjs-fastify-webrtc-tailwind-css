import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export const useWebRTC = (socket: Socket | null, localVideoRef: React.RefObject<HTMLVideoElement>) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const createPeerConnection = useCallback((userId: string) => {
    const peerConnection = new RTCPeerConnection(iceServers);
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev).set(userId, remoteStream));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          targetUserId: userId,
          candidate: event.candidate
        });
      }
    };

    return peerConnection;
  }, [socket]);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsCallActive(true);
      
      if (socket) {
        socket.emit('start-video-call');
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }, [socket, localVideoRef]);

  const endCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Close all peer connections
    peersRef.current.forEach(peer => {
      peer.connection.close();
    });
    peersRef.current.clear();
    setPeers(new Map());
    setRemoteStreams(new Map());

    setIsCallActive(false);
    
    if (socket) {
      socket.emit('end-video-call');
    }
  }, [socket]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const handleOffer = useCallback(async (data: { offer: RTCSessionDescriptionInit; fromUserId: string }) => {
    const { offer, fromUserId } = data;
    
    const peerConnection = createPeerConnection(fromUserId);
    peersRef.current.set(fromUserId, { userId: fromUserId, connection: peerConnection });
    setPeers(new Map(peersRef.current));

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    if (socket) {
      socket.emit('webrtc-answer', {
        targetUserId: fromUserId,
        answer: answer
      });
    }
  }, [socket, createPeerConnection]);

  const handleAnswer = useCallback(async (data: { answer: RTCSessionDescriptionInit; fromUserId: string }) => {
    const { answer, fromUserId } = data;
    const peer = peersRef.current.get(fromUserId);
    
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async (data: { candidate: RTCIceCandidateInit; fromUserId: string }) => {
    const { candidate, fromUserId } = data;
    const peer = peersRef.current.get(fromUserId);
    
    if (peer) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const initiateCall = useCallback(async (targetUserId: string) => {
    const peerConnection = createPeerConnection(targetUserId);
    peersRef.current.set(targetUserId, { userId: targetUserId, connection: peerConnection });
    setPeers(new Map(peersRef.current));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    if (socket) {
      socket.emit('webrtc-offer', {
        targetUserId: targetUserId,
        offer: offer
      });
    }
  }, [socket, createPeerConnection]);

  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    
    socket.on('video-call-started', (data) => {
      if (isCallActive && data.initiatorId !== socket.id) {
        initiateCall(data.initiatorId);
      }
    });

    socket.on('user-joined', (data) => {
      if (isCallActive) {
        // Initiate call with new user
        initiateCall(data.userId);
      }
    });

    socket.on('user-left', (data) => {
      const peer = peersRef.current.get(data.userId);
      if (peer) {
        peer.connection.close();
        peersRef.current.delete(data.userId);
        setPeers(new Map(peersRef.current));
        setRemoteStreams(prev => {
          const updated = new Map(prev);
          updated.delete(data.userId);
          return updated;
        });
      }
    });

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      socket.off('video-call-started');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, initiateCall, isCallActive]);

  return {
    isCallActive,
    localStream,
    remoteStreams,
    isMuted,
    isVideoEnabled,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    initiateCall
  };
};