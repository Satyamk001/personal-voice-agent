import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Message, AgentStatus, ChatResponse } from '../types';
import { sendChatMessage, sendVoiceMessage, setStoredAuth } from '../services/api';
import { useSession } from '../hooks/useSession';
import type { RecordingResult } from '../hooks/useRecorder';

const MESSAGES_KEY = 'voice_agent_messages';

interface ChatContextValue {
  messages: Message[];
  status: AgentStatus;
  statusMessage: string;
  error: string | null;
  sessionId: string;
  isPlayingAudio: boolean;
  authRequired: boolean;
  sendText: (text: string) => Promise<void>;
  sendVoice: (result: RecordingResult) => Promise<void>;
  playAudio: (base64Audio: string) => Promise<void>;
  stopAudio: () => void;
  clearChat: () => void;
  resetSessionAndChat: () => void;
  submitAuth: (user: string, pass: string) => void;
  dismissAuthModal: () => void;
  setStatus: (status: AgentStatus, message?: string) => void;
  setError: (err: string | null) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sessionId, resetSession } = useSession();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(MESSAGES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [status, setStatusState] = useState<AgentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Sync messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // quota or private browsing issue
    }
  }, [messages]);

  const setStatus = useCallback((newStatus: AgentStatus, msg: string = '') => {
    setStatusState(newStatus);
    setStatusMessage(msg);
  }, []);

  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    setIsPlayingAudio(false);
    if (status === 'speaking') {
      setStatus('idle', '');
    }
  }, [status, setStatus]);

  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    stopAudio();
    if (!base64Audio) return;

    try {
      setStatus('speaking', 'Speaking...');
      setIsPlayingAudio(true);
      const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        setStatus('idle', '');
        audioPlayerRef.current = null;
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setStatus('idle', '');
        audioPlayerRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.warn('Audio auto-play prevented or error:', err);
      setIsPlayingAudio(false);
      setStatus('idle', '');
    }
  }, [stopAudio, setStatus]);

  const handleApiError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'AUTH_REQUIRED') {
      setAuthRequired(true);
      setError('Authentication required by server.');
    } else {
      setError(msg);
    }
    setStatus('idle', '');
  };

  const sendText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setError(null);
    stopAudio();

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setStatus('thinking', 'Thinking...');

    try {
      const response: ChatResponse = await sendChatMessage(trimmed, sessionId);

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        text: response.reply,
        timestamp: Date.now(),
        audioBase64: response.audio_base64 || null,
      };

      setMessages((prev) => [...prev, agentMsg]);
      setStatus('idle', '');

      if (response.audio_base64) {
        await playAudio(response.audio_base64);
      }
    } catch (err) {
      handleApiError(err);
    }
  }, [sessionId, stopAudio, playAudio, setStatus]);

  const sendVoice = useCallback(async (recording: RecordingResult) => {
    setError(null);
    stopAudio();
    setStatus('transcribing', 'Transcribing audio...');

    try {
      const response: ChatResponse = await sendVoiceMessage(
        recording.blob,
        recording.fileName,
        sessionId
      );

      const userText = response.transcript || '(Unclear voice input)';
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        text: userText,
        timestamp: Date.now(),
      };

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        text: response.reply,
        timestamp: Date.now(),
        audioBase64: response.audio_base64 || null,
      };

      setMessages((prev) => [...prev, userMsg, agentMsg]);
      setStatus('idle', '');

      if (response.audio_base64) {
        await playAudio(response.audio_base64);
      }
    } catch (err) {
      handleApiError(err);
    }
  }, [sessionId, stopAudio, playAudio, setStatus]);

  const clearChat = useCallback(() => {
    stopAudio();
    setMessages([]);
    localStorage.removeItem(MESSAGES_KEY);
    setError(null);
    setStatus('idle', '');
  }, [stopAudio, setStatus]);

  const resetSessionAndChat = useCallback(() => {
    clearChat();
    resetSession();
  }, [clearChat, resetSession]);

  const submitAuth = useCallback((user: string, pass: string) => {
    setStoredAuth(user, pass);
    setAuthRequired(false);
    setError(null);
  }, []);

  const dismissAuthModal = useCallback(() => {
    setAuthRequired(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        status,
        statusMessage,
        error,
        sessionId,
        isPlayingAudio,
        authRequired,
        sendText,
        sendVoice,
        playAudio,
        stopAudio,
        clearChat,
        resetSessionAndChat,
        submitAuth,
        dismissAuthModal,
        setStatus,
        setError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
