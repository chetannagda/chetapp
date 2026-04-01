export interface Message {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  filename?: string;
  timestamp: string;
  type: 'text' | 'image';
  replyTo: ReplyTo | null;
}

export interface ReplyTo {
  id: string;
  sender: string;
  content: string;
  type: 'text' | 'image';
}

export interface User {
  id: string;
  username: string;
}

export interface RoomData {
  channelCode: string;
  messages: Message[];
  users: User[];
}

export interface TypingUpdate {
  users: string[];
}

export interface ChatState {
  isConnected: boolean;
  channelCode: string | null;
  username: string | null;
  messages: Message[];
  users: User[];
  typingUsers: string[];
}
