import { useState, useRef, useCallback } from 'react';
import { useAudioMeter, SILENCE_PEAK_THRESHOLD } from './useAudioMeter';

export const MIN_RECORDING_MS = 1000;

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function pickSupportedMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) return '';
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

export interface RecordingResult {
  blob: Blob;
  fileName: string;
  durationMs: number;
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0); // in seconds
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const audioMeter = useAudioMeter();

  const startRecording = useCallback(async () => {
    if (isRecording || (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording')) {
      return;
    }
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start();
      audioMeter.startMeter(stream);

      startTimeRef.current = performance.now();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        const secs = (performance.now() - startTimeRef.current) / 1000;
        setDuration(secs);
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Microphone access error: ${message}`);
      setIsRecording(false);
    }
  }, [isRecording, audioMeter]);

  const stopRecording = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const recorder = mediaRecorderRef.current;
      const stream = streamRef.current;

      if (!recorder || recorder.state !== 'recording') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const durationMs = performance.now() - startTimeRef.current;
        setIsRecording(false);
        audioMeter.stopMeter();

        // Stop all audio tracks
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Validate duration
        if (durationMs < MIN_RECORDING_MS) {
          setError('Too short — please hold at least 1 second while speaking.');
          resolve(null);
          return;
        }

        // Validate audio signal
        if (audioMeter.peakLevel < SILENCE_PEAK_THRESHOLD) {
          setError('No audio detected — please check your microphone and volume.');
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = extensionFor(mimeType);
        const fileName = `command.${ext}`;

        resolve({ blob, fileName, durationMs });
      };

      recorder.stop();
    });
  }, [audioMeter]);

  return {
    isRecording,
    duration,
    error,
    setError,
    startRecording,
    stopRecording,
    audioMeter,
  };
}

