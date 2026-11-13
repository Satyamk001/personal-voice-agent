import { useState, useCallback } from 'react';

const SESSION_KEY = 'session_id';

function getInitialSession(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }
  const newId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, newId);
  return newId;
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>(getInitialSession);

  const resetSession = useCallback(() => {
    const newId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, newId);
    setSessionId(newId);
  }, []);

  return { sessionId, resetSession };
}

