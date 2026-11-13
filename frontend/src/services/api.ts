import type { ChatResponse } from '../types';

const AUTH_KEY = 'voice_agent_auth';

export function getStoredAuth(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function setStoredAuth(username: string, password: string): void {
  const credentials = btoa(`${username}:${password}`);
  localStorage.setItem(AUTH_KEY, `Basic ${credentials}`);
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

function getAuthHeaders(): HeadersInit {
  const auth = getStoredAuth();
  return auth ? { Authorization: auth } : {};
}

async function handleResponse(response: Response): Promise<ChatResponse> {
  if (response.status === 401) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function sendChatMessage(message: string, sessionId: string): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append('message', message);
  formData.append('session_id', sessionId);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  return handleResponse(response);
}

export async function sendVoiceMessage(
  audioBlob: Blob,
  fileName: string,
  sessionId: string
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, fileName);
  formData.append('session_id', sessionId);

  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  return handleResponse(response);
}
