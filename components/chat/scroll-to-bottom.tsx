'use client';

import { ChevronDown } from 'lucide-react';

interface ScrollToBottomProps {
  onClick: () => void;
}

export function ScrollToBottom({ onClick }: ScrollToBottomProps) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
      <button
        onClick={onClick}
        className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
      >
        <ChevronDown className="h-4 w-4" />
        <span>New messages</span>
      </button>
    </div>
  );
}
