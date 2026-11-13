import React from 'react';
import { Loader2, AlertCircle, Volume2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const StatusBar: React.FC = () => {
  const { status, statusMessage, error, setError } = useChat();

  return (
    <div className="w-full">
      {/* Error Message */}
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-rose-950/70 text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dynamic Status Indicator */}
      {status !== 'idle' && (
        <div className="flex items-center justify-center gap-2 py-1 text-sm text-neutral-400">
          {status === 'recording' && (
            <span className="text-orange-400 font-medium">
              {statusMessage || 'Listening to your command...'}
            </span>
          )}

          {status === 'transcribing' && (
            <div className="flex items-center gap-2 text-neutral-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
              <span>{statusMessage || 'Transcribing speech audio...'}</span>
            </div>
          )}

          {status === 'thinking' && (
            <div className="flex items-center gap-2 text-neutral-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
              <span>{statusMessage || 'Aria is processing...'}</span>
            </div>
          )}

          {status === 'speaking' && (
            <div className="flex items-center gap-2 text-neutral-300">
              <Volume2 className="w-3.5 h-3.5 text-neutral-300" />
              <span>{statusMessage || 'Speaking audio response...'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
