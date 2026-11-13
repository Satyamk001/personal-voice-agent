import React from 'react';
import { Trash2, RefreshCw, VolumeX } from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const Header: React.FC = () => {
  const { isPlayingAudio, stopAudio, clearChat, resetSessionAndChat, sessionId, messages } = useChat();

  return (
    <header className="sticky top-0 z-20 px-6 py-4 bg-neutral-900/90">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-semibold tracking-tight text-neutral-100">
            Aria
          </span>
          <span className="text-sm text-neutral-400">
            Executive Voice Console
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPlayingAudio && (
            <button
              type="button"
              onClick={stopAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute</span>
            </button>
          )}

          <button
            type="button"
            onClick={resetSessionAndChat}
            className="p-2 text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
            title={`Reset Session (${sessionId.slice(0, 8)})`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="p-2 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
              title="Clear transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
