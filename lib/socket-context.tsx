'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Message, User, RoomData, TypingUpdate, ReplyTo, ChatState } from './types';

interface SocketContextType extends ChatState {
  joinRoom: (channelCode: string, username: string) => void;
  sendMessage: (content: string, replyTo: ReplyTo | null) => void;
  sendImage: (imageUrl: string, filename: string, replyTo: ReplyTo | null) => void;
  startTyping: () => void;
  stopTyping: () => void;
  generateCode: () => void;
  leaveRoom: () => void;
  error: string | null;
  generatedCode: string | null;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ChatState>({
    isConnected: false,
    channelCode: null,
    username: null,
    messages: [],
    users: [],
    typingUsers: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!SOCKET_URL) {
      setError('Chat server is not configured. Set NEXT_PUBLIC_SOCKET_URL in your deployment environment.');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[v0] Socket connected');
      setState(prev => ({ ...prev, isConnected: true }));
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('[v0] Socket disconnected');
      setState(prev => ({ ...prev, isConnected: false }));
    });

    newSocket.on('connect_error', (err) => {
      console.log('[v0] Connection error:', err.message);
      setError('Failed to connect to server. Please try again.');
    });

    newSocket.on('room-joined', (data: RoomData) => {
      console.log('[v0] Room joined:', data.channelCode);
      setState(prev => ({
        ...prev,
        channelCode: data.channelCode,
        messages: data.messages,
        users: data.users,
      }));
      setError(null);
    });

    newSocket.on('new-message', (message: Message) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
    });

    newSocket.on('user-joined', (data: { username: string; users: User[] }) => {
      setState(prev => ({
        ...prev,
        users: data.users,
        messages: [...prev.messages, {
          id: `system-${Date.now()}`,
          sender: 'System',
          senderId: 'system',
          content: `${data.username} joined the chat`,
          timestamp: new Date().toISOString(),
          type: 'text' as const,
          replyTo: null,
        }],
      }));
    });

    newSocket.on('user-left', (data: { username: string; users: User[] }) => {
      setState(prev => ({
        ...prev,
        users: data.users,
        messages: [...prev.messages, {
          id: `system-${Date.now()}`,
          sender: 'System',
          senderId: 'system',
          content: `${data.username} left the chat`,
          timestamp: new Date().toISOString(),
          type: 'text' as const,
          replyTo: null,
        }],
      }));
    });

    newSocket.on('typing-update', (data: TypingUpdate) => {
      setState(prev => ({
        ...prev,
        typingUsers: data.users,
      }));
    });

    newSocket.on('code-generated', (data: { code: string }) => {
      setGeneratedCode(data.code);
    });

    newSocket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((channelCode: string, username: string) => {
    if (socket) {
      setState(prev => ({ ...prev, username }));
      socket.emit('join-room', { channelCode, username });
    }
  }, [socket]);

  const sendMessage = useCallback((content: string, replyTo: ReplyTo | null) => {
    if (socket && content.trim()) {
      socket.emit('send-message', { content, replyTo });
    }
  }, [socket]);

  const sendImage = useCallback((imageUrl: string, filename: string, replyTo: ReplyTo | null) => {
    if (socket) {
      socket.emit('send-image', { imageUrl, filename, replyTo });
    }
  }, [socket]);

  const startTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing-start');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop');
      }, 2000);
    }
  }, [socket]);

  const stopTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing-stop');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [socket]);

  const generateCode = useCallback(() => {
    if (socket) {
      socket.emit('generate-code');
    }
  }, [socket]);

  const leaveRoom = useCallback(() => {
    setState({
      isConnected: state.isConnected,
      channelCode: null,
      username: null,
      messages: [],
      users: [],
      typingUsers: [],
    });
  }, [state.isConnected]);

  return (
    <SocketContext.Provider value={{
      ...state,
      joinRoom,
      sendMessage,
      sendImage,
      startTyping,
      stopTyping,
      generateCode,
      leaveRoom,
      error,
      generatedCode,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
