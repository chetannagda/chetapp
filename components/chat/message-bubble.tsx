'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { Message, ReplyTo } from '@/lib/types';
import { Reply, Copy, Check, Download, Image as ImageIcon } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  onReply: (message: ReplyTo) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

export function MessageBubble({ message, isOwn, showSender, onReply }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // System messages
  if (message.senderId === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  const handleCopy = async () => {
    if (message.type === 'text') {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReply = () => {
    onReply({
      id: message.id,
      sender: message.sender,
      content: message.content,
      type: message.type,
    });
  };

  const handleDownload = async () => {
    if (!SOCKET_URL && !message.content.startsWith('http')) {
      console.error('Image server is not configured. Set NEXT_PUBLIC_SOCKET_URL in deployment settings.');
      return;
    }

    const imageUrl = message.content.startsWith('http') 
      ? message.content 
      : `${SOCKET_URL}${message.content}`;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = message.filename || 'image';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const timestamp = format(new Date(message.timestamp), 'HH:mm');

  const imageUrl = message.type === 'image' 
    ? (message.content.startsWith('http') 
        ? message.content 
        : SOCKET_URL
          ? `${SOCKET_URL}${message.content}`
          : message.content)
    : null;

  return (
    <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-4' : 'mt-0.5'}`}>
      <div className={`relative max-w-[75%] md:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showSender && !isOwn && (
          <span className="mb-1 ml-1 block text-xs font-medium text-primary">
            {message.sender}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`relative rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-message-own text-message-own-foreground rounded-br-md'
              : 'bg-message-other text-message-other-foreground rounded-bl-md'
          }`}
        >
          {/* Reply preview */}
          {message.replyTo && (
            <div className={`mb-2 rounded-lg px-3 py-2 text-xs ${
              isOwn ? 'bg-black/10' : 'bg-white/10'
            }`}>
              <span className="font-medium">{message.replyTo.sender}</span>
              <p className="mt-0.5 truncate opacity-80">
                {message.replyTo.type === 'image' ? (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Photo
                  </span>
                ) : (
                  message.replyTo.content
                )}
              </p>
            </div>
          )}

          {/* Message content */}
          {message.type === 'image' ? (
            <div className="relative">
              {!imageLoaded && (
                <div className="flex h-48 w-64 items-center justify-center rounded-lg bg-muted">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
              <img
                src={imageUrl || ''}
                alt="Shared image"
                className={`max-h-80 max-w-full rounded-lg object-cover ${!imageLoaded ? 'hidden' : ''}`}
                onLoad={() => setImageLoaded(true)}
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </p>
          )}

          {/* Timestamp */}
          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isOwn ? 'text-message-own-foreground/60' : 'text-message-other-foreground/60'
          }`}>
            <span>{timestamp}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 ${
          isOwn ? '-left-20' : '-right-20'
        } flex items-center gap-1`}>
          <button
            onClick={handleReply}
            className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Reply"
          >
            <Reply className="h-4 w-4" />
          </button>
          
          {message.type === 'text' ? (
            <button
              onClick={handleCopy}
              className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Copy"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
