'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket-context';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ChatHeader } from './chat-header';
import { OnlineUsers } from './online-users';
import { TypingIndicator } from './typing-indicator';
import { ScrollToBottom } from './scroll-to-bottom';
import type { ReplyTo } from '@/lib/types';

export function ChatWindow() {
  const { messages, username, typingUsers } = useSocket();
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    // Auto-scroll on new message if near bottom
    const container = scrollContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Initial scroll to bottom
    scrollToBottom('instant');
  }, [scrollToBottom]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      setShowScrollButton(!isNearBottom);
    }
  };

  const handleReply = (message: ReplyTo) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleMessageSent = () => {
    setReplyTo(null);
    scrollToBottom();
  };

  // Filter out current user from typing users
  const otherTypingUsers = typingUsers.filter(u => u !== username);

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        <ChatHeader onToggleUsers={() => setShowUsers(!showUsers)} showUsers={showUsers} />
        
        {/* Messages Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 chat-scrollbar"
        >
          <div className="mx-auto max-w-3xl space-y-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <svg
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">No messages yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Be the first to send a message!
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const showSender = !prevMessage || 
                  prevMessage.sender !== message.sender || 
                  prevMessage.senderId === 'system' ||
                  message.senderId === 'system';
                
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.sender === username}
                    showSender={showSender}
                    onReply={handleReply}
                  />
                );
              })
            )}
            
            {otherTypingUsers.length > 0 && (
              <TypingIndicator users={otherTypingUsers} />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <ScrollToBottom onClick={() => scrollToBottom()} />
        )}

        {/* Message Input */}
        <MessageInput
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          onMessageSent={handleMessageSent}
        />
      </div>

      {/* Online Users Sidebar (Desktop) */}
      <div className={`border-l border-border bg-card transition-all duration-300 ${
        showUsers ? 'w-64' : 'w-0 overflow-hidden'
      } hidden md:block`}>
        {showUsers && <OnlineUsers />}
      </div>

      {/* Mobile Users Overlay */}
      {showUsers && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setShowUsers(false)}
        >
          <div 
            className="absolute right-0 top-0 h-full w-64 bg-card border-l border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <OnlineUsers />
          </div>
        </div>
      )}
    </div>
  );
}
