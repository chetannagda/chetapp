'use client';

import { SocketProvider, useSocket } from '@/lib/socket-context';
import { JoinRoom } from '@/components/chat/join-room';
import { ChatWindow } from '@/components/chat/chat-window';

function ChatApp() {
  const { channelCode } = useSocket();

  if (!channelCode) {
    return <JoinRoom />;
  }

  return <ChatWindow />;
}

export default function Home() {
  return (
    <SocketProvider>
      <ChatApp />
    </SocketProvider>
  );
}
