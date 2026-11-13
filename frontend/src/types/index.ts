export interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
  audioBase64?: string | null;
}

export type AgentStatus = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

export interface ChatResponse {
  transcript: string;
  reply: string;
  audio_base64?: string | null;
}

