/**
 * Small floating chat/search button in the bottom-right of the canvas.
 * Toggles the chat rail open/closed.
 */
import { MessageSquare, Search } from 'lucide-react';

interface Props {
  onToggleChat: () => void;
}

export function ChatFab({ onToggleChat }: Props) {
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-neutral-900 text-white rounded-full shadow-xl px-1 py-1">
      <button
        onClick={onToggleChat}
        title="Open chat"
        className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
      <button
        title="Search"
        className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
}
