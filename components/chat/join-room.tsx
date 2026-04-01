'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hash, User, Loader2, RefreshCw, MessageCircle } from 'lucide-react';

export function JoinRoom() {
  const { joinRoom, generateCode, generatedCode, error, isConnected } = useSocket();
  const [username, setUsername] = useState('');
  const [channelCode, setChannelCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (generatedCode) {
      setChannelCode(generatedCode);
    }
  }, [generatedCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    const trimmedUsername = username.trim();
    const trimmedCode = channelCode.trim().toUpperCase();
    
    if (!trimmedUsername) {
      setLocalError('Please enter a username');
      return;
    }
    
    if (trimmedUsername.length > 30) {
      setLocalError('Username must be 30 characters or less');
      return;
    }
    
    if (!trimmedCode) {
      setLocalError('Please enter a channel code');
      return;
    }
    
    if (!/^[a-zA-Z0-9]{4,20}$/.test(trimmedCode)) {
      setLocalError('Channel code must be 4-20 alphanumeric characters');
      return;
    }
    
    setIsJoining(true);
    joinRoom(trimmedCode, trimmedUsername);
    
    // Reset joining state after a timeout (in case of error)
    setTimeout(() => setIsJoining(false), 3000);
  };

  const handleGenerateCode = () => {
    generateCode();
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">ChetApp</CardTitle>
          <CardDescription className="text-muted-foreground">
            Join a chat room with a channel code. No sign-up required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  maxLength={30}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="channelCode" className="text-sm font-medium text-foreground">
                Channel Code
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="channelCode"
                  type="text"
                  placeholder="Enter code or generate one"
                  value={channelCode}
                  onChange={(e) => setChannelCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-wider"
                  maxLength={20}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Generate new code"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with others to join the same room
              </p>
            </div>

            {displayError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {displayError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isJoining || !isConnected}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : !isConnected ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Join Chat'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Messages are temporary and will be deleted when the server restarts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
