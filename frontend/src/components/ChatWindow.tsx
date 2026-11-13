import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { MessageBubble } from './MessageBubble';

const SPECIALISTS = [
  {
    tag: 'Gmail',
    prompt: 'What is the latest unread message in my inbox?',
  },
  {
    tag: 'Notion',
    prompt: 'Search my Notion workspace for anything about pricing.',
  },
  {
    tag: 'Research',
    prompt: 'Research the pros and cons of server-side rendering and save it to Notion.',
  },
];

export const ChatWindow: React.FC = () => {
  const { messages, status, sendText } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 custom-scrollbar">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col justify-center max-w-2xl mx-auto py-8">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-neutral-100 leading-tight mb-4">
              Aria Voice Console
            </h1>
            <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-xl">
              Voice-driven executive assistant connected to your Gmail inbox, Notion workspace, and real-time web research via Model Context Protocol.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-neutral-400">
              Direct voice commands:
            </p>
            <div className="space-y-2.5">
              {SPECIALISTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendText(item.prompt)}
                  className="w-full text-left p-4 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-200 transition-colors cursor-pointer flex items-baseline gap-3 group"
                >
                  <span className="text-xs font-medium text-orange-400 shrink-0">
                    {item.tag}
                  </span>
                  <span className="text-sm sm:text-base text-neutral-200 group-hover:text-white">
                    "{item.prompt}"
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Thinking indicator */}
          {status === 'thinking' && (
            <div className="w-full my-4">
              <div className="bg-neutral-900/60 rounded-lg p-4 max-w-3xl flex items-center gap-3 text-neutral-300 text-sm sm:text-base">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
                <span>Orchestrating agent specialist tools...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
