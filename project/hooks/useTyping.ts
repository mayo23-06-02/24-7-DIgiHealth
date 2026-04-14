import { useState, useRef } from 'react';

export function useTyping(consultationId: string | string[], userId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const emitTyping = () => {
    // In a real app with Socket.io, you'd do: socket.emit('typing', { consultationId, userId });
    // With polling, you might POST to a `/api/chat/typing` endpoint and poll it.
    // For this implementation, we will stub it as the request asked to use polling for messages,
    // and typing is often too frequent for pure REST polling without Redis.
  };

  return { typingUsers, emitTyping };
}
