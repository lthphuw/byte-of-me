import { useEffect, useState } from 'react';

import { randomId } from './utils';

export function useChatSession() {
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    let stored = localStorage.getItem('chat_session_id');
    if (!stored) {
      stored = randomId();
      localStorage.setItem('chat_session_id', stored);
    }
    setThreadId(stored);
  }, []);

  return threadId;
}
