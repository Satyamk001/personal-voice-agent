import React from 'react';

interface AudioVisualizerProps {
  frequencyData: number[];
  level: number;
  isRecording: boolean;
  peakLevel: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  frequencyData,
  level,
  isRecording,
  peakLevel,
}) => {
  if (!isRecording) return null;

  const isSilent = peakLevel < 0.03;
  const bars = frequencyData.length > 0 ? frequencyData : Array(24).fill(0.1);

  return (
    <div className="w-full max-w-xs mx-auto py-2 flex flex-col items-center">
      {/* Precision Audio Waveform Monitor */}
      <div className="h-7 flex items-center justify-center gap-1 w-full px-2">
        {bars.map((val, idx) => {
          const barHeightPercent = Math.max(14, Math.min(100, val * 100 * 1.6 + level * 25));
          return (
            <div
              key={idx}
              className={`w-1 rounded-xs transition-opacity duration-75 ${
                isSilent ? 'bg-neutral-600' : 'bg-orange-500'
              }`}
              style={{
                height: `${barHeightPercent}%`,
              }}
            />
          );
        })}
      </div>

      {/* Peak level gauge */}
      <div className="w-full max-w-[200px] h-1 bg-neutral-800 rounded-full overflow-hidden mt-2">
        <div
          className={`h-full transition-opacity duration-75 ${
            isSilent ? 'bg-neutral-500' : 'bg-orange-500'
          }`}
          style={{ width: `${Math.min(100, level * 100 * 3)}%` }}
        />
      </div>

      <span className="text-xs text-neutral-400 mt-1.5 font-normal">
        {isSilent ? 'No signal detected' : 'Capturing audio stream'}
      </span>
    </div>
  );
};
