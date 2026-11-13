import { useRef, useState, useCallback } from 'react';

export const SILENCE_PEAK_THRESHOLD = 0.03;

export function useAudioMeter() {
  const [level, setLevel] = useState(0); // 0.0 to 1.0
  const [peakLevel, setPeakLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const peakRef = useRef(0);

  const startMeter = useCallback((stream: MediaStream) => {
    stopMeter();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256; // 128 frequency bins
    analyser.smoothingTimeConstant = 0.8;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    peakRef.current = 0;
    setPeakLevel(0);
    setLevel(0);

    const timeDomainBuffer = new Uint8Array(analyser.fftSize);
    const frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteTimeDomainData(timeDomainBuffer);
      let instantPeak = 0;
      for (let i = 0; i < timeDomainBuffer.length; i++) {
        const val = Math.abs(timeDomainBuffer[i] - 128) / 128;
        if (val > instantPeak) instantPeak = val;
      }

      if (instantPeak > peakRef.current) {
        peakRef.current = instantPeak;
        setPeakLevel(instantPeak);
      }
      setLevel(instantPeak);

      analyserRef.current.getByteFrequencyData(frequencyBuffer);
      // Downsample to 16 visual bars
      const bars: number[] = [];
      const step = Math.floor(frequencyBuffer.length / 16);
      for (let i = 0; i < 16; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += frequencyBuffer[i * step + j] || 0;
        }
        bars.push(sum / step / 255); // 0.0 to 1.0
      }
      setFrequencyData(bars);

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
    setFrequencyData([]);
  }, []);

  return {
    level,
    peakLevel: peakRef.current || peakLevel,
    frequencyData,
    startMeter,
    stopMeter,
  };
}

