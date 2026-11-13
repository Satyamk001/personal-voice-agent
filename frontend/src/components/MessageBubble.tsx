import React from 'react';
import { Volume2 } from 'lucide-react';
import type { Message } from '../types';
import { useChat } from '../context/ChatContext';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { playAudio } = useChat();
  const isUser = message.role === 'user';

  const timeString = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full my-4">
      <div
        className={`rounded-lg p-4 sm:p-5 ${
          isUser ? 'bg-neutral-900/80 ml-auto max-w-2xl' : 'bg-neutral-900/40 max-w-3xl'
        }`}
      >
        <div className="flex items-baseline justify-between mb-2">
          <span
            className={`text-sm font-semibold ${
              isUser ? 'text-neutral-300' : 'text-orange-400'
            }`}
          >
            {isUser ? 'You' : 'Aria'}
          </span>
          <span className="text-xs text-neutral-400">{timeString}</span>
        </div>

        <div className="text-neutral-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </div>

        {/* Audio Replay Button */}
        {!isUser && message.audioBase64 && (
          <div className="mt-3 flex items-center">
            <button
              type="button"
              onClick={() => message.audioBase64 && playAudio(message.audioBase64)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded cursor-pointer transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-orange-400" />
              <span>Replay voice message</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
