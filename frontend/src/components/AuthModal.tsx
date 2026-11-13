import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const AuthModal: React.FC = () => {
  const { authRequired, submitAuth, dismissAuthModal } = useChat();
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('');

  if (!authRequired) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitAuth(username, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-neutral-900 rounded-xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center space-x-3 text-neutral-100">
          <div className="p-2 rounded bg-neutral-800 text-neutral-200">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-100 text-base">
              Authentication Required
            </h3>
            <p className="text-xs text-neutral-400">
              Enter your HTTP Basic Auth credentials
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 bg-neutral-950 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              required
              className="w-full px-3 py-2 bg-neutral-950 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={dismissAuthModal}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-900 hover:bg-neutral-200 rounded cursor-pointer transition-colors"
            >
              Log In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
