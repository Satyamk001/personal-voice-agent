import React from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useRecorder } from '../hooks/useRecorder';
import { AudioVisualizer } from './AudioVisualizer';

export const RecordButton: React.FC = () => {
  const { status, sendVoice, setStatus } = useChat();
  const {
    isRecording,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
    audioMeter,
  } = useRecorder();

  const isBusy = status === 'transcribing' || status === 'thinking';

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setStatus('recording', 'Listening...');
    await startRecording();
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isRecording) return;

    const result = await stopRecording();
    if (result) {
      await sendVoice(result);
    } else {
      setStatus('idle', '');
    }
  };

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          disabled={isBusy}
          className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex flex-col items-center justify-center transition-colors transition-transform duration-150 cursor-pointer ${
            isBusy
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
              : isRecording
              ? 'bg-orange-600 text-white scale-105'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 active:scale-95'
          }`}
          title="Press and hold to talk"
        >
          {isBusy ? (
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="mt-2.5 text-center">
        {isRecording ? (
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-neutral-800 text-orange-400">
              Recording {duration.toFixed(1)}s
            </span>
            <AudioVisualizer
              frequencyData={audioMeter.frequencyData}
              level={audioMeter.level}
              isRecording={isRecording}
              peakLevel={audioMeter.peakLevel}
            />
          </div>
        ) : (
          <p className="text-sm text-neutral-400 font-normal">
            {isBusy ? 'Processing request' : 'Hold to speak, release to send'}
          </p>
        )}

        {recorderError && (
          <p className="text-sm text-rose-400 mt-1 max-w-xs">{recorderError}</p>
        )}
      </div>
    </div>
  );
};
