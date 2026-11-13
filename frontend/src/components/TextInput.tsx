import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const TextInput: React.FC = () => {
  const [text, setText] = useState('');
  const { sendText, status } = useChat();

  const isBusy = status === 'thinking' || status === 'transcribing';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isBusy) return;

    const message = text;
    setText('');
    await sendText(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full relative flex items-center">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isBusy}
        placeholder={
          isBusy ? 'Aria is processing...' : 'Type a command or query (e.g. "Check unread emails")...'
        }
        className="w-full pl-4 pr-12 py-3 bg-neutral-900 rounded-lg text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-colors disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={!text.trim() || isBusy}
        className="absolute right-2.5 p-1.5 text-neutral-400 hover:text-neutral-100 disabled:text-neutral-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
        title="Send text command"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
};
