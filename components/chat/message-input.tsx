'use client';

import { useState, useRef, useEffect } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Button } from '@/components/ui/button';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import type { ReplyTo } from '@/lib/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface MessageInputProps {
  replyTo: ReplyTo | null;
  onCancelReply: () => void;
  onMessageSent: () => void;
}

export function MessageInput({ replyTo, onCancelReply, onMessageSent }: MessageInputProps) {
  const { sendMessage, sendImage, startTyping, stopTyping } = useSocket();
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    // Handle image upload
    if (selectedFile && previewImage) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const response = await fetch(`${SOCKET_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();
        sendImage(data.url, data.originalName, replyTo);
        clearImagePreview();
        onMessageSent();
      } catch (error) {
        console.error('Upload error:', error);
        if (error instanceof TypeError) {
          setUploadError('Cannot reach upload server. Make sure backend is running on port 3001 and CORS is allowed.');
        } else {
          setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
        }
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Handle text message
    if (message.trim()) {
      sendMessage(message.trim(), replyTo);
      setMessage('');
      stopTyping();
      onMessageSent();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    startTyping();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.');
        return;
      }

      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('File too large. Maximum size is 50MB.');
        return;
      }

      setUploadError(null);
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImagePreview = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="mx-auto max-w-3xl">
        {/* Reply preview */}
        {replyTo && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-muted px-4 py-2">
            <div className="flex-1 overflow-hidden">
              <span className="text-xs font-medium text-primary">
                Replying to {replyTo.sender}
              </span>
              <p className="truncate text-xs text-muted-foreground">
                {replyTo.type === 'image' ? 'Photo' : replyTo.content}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="ml-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Image preview */}
        {previewImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-40 rounded-lg object-cover"
            />
            <button
              onClick={clearImagePreview}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {uploadError}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />
          
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={openFilePicker}
            disabled={isUploading}
            className="h-11 w-11 shrink-0 rounded-xl border border-border/80 shadow-sm transition-all hover:scale-[1.03] hover:border-primary/50 hover:bg-primary/10"
            title="Upload image"
            aria-label="Upload image"
          >
            <ImageIcon className="h-6 w-6 sm:h-6 sm:w-6" />
          </Button>

          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={previewImage ? 'Add a caption...' : 'Type a message...'}
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all max-h-32"
              rows={1}
              style={{ minHeight: '44px' }}
              disabled={isUploading}
            />
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={(!message.trim() && !previewImage) || isUploading}
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
