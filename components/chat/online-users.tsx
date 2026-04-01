'use client';

import { useSocket } from '@/lib/socket-context';
import { Users } from 'lucide-react';

export function OnlineUsers() {
  const { users, username } = useSocket();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">
            Online ({users.length})
          </h2>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
          >
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-online-indicator" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {user.username}
                {user.username === username && (
                  <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
