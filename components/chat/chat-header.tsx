'use client';

import { useSocket } from '@/lib/socket-context';
import { Button } from '@/components/ui/button';
import { Hash, Users, LogOut, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ChatHeaderProps {
  onToggleUsers: () => void;
  showUsers: boolean;
}

export function ChatHeader({ onToggleUsers, showUsers }: ChatHeaderProps) {
  const { channelCode, users, leaveRoom, isConnected } = useSocket();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (channelCode) {
      await navigator.clipboard.writeText(channelCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-card/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Hash className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">ChetApp</p>
          <div className="flex items-center gap-2">
            <h1 className="truncate font-semibold text-foreground">{channelCode}</h1>
            <button
              onClick={handleCopyCode}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Copy channel code"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-online-indicator' : 'bg-destructive'}`} />
            <span className="truncate">{users.length} online</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleUsers}
          className={showUsers ? 'bg-muted' : ''}
          title="Toggle online users"
        >
          <Users className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={leaveRoom}
          title="Leave room"
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
