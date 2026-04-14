import { useState, useEffect } from 'react';

export function useChat(id: string, isConversationId: boolean = false) {
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial conversation info
  useEffect(() => {
    if (!id) return;
    const url = isConversationId 
      ? `/api/chat/conversations/direct/${id}`
      : `/api/chat/conversations/${id}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setConversation(data);
      });
  }, [id, isConversationId]);

  // Fetch & Poll messages
  useEffect(() => {
    if (!id) return;
    
    let lastMessageDate = '';

    const fetchMessages = async () => {
      const baseUrl = isConversationId 
        ? `/api/chat/messages/direct/${id}`
        : `/api/chat/messages/${id}`;

      const url = lastMessageDate 
          ? `${baseUrl}?after=${lastMessageDate}`
          : `${baseUrl}?limit=50`;
          
      try {
          const res = await fetch(url);
          const newMessages = await res.json();
          if (newMessages.length > 0) {
              setMessages(prev => {
                const combined = [...prev, ...newMessages];
                const seen = new Set();
                return combined.filter(msg => {
                  const id = msg._id || msg.id;
                  if (seen.has(id)) return false;
                  seen.add(id);
                  return true;
                });
              });
              lastMessageDate = newMessages[newMessages.length - 1].createdAt;
          }
      } catch (err) {
          console.error('Failed to fetch messages:', err);
      } finally {
          setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [id, isConversationId]);

  const sendMessage = async (msgData: any) => {
    // Optimistic UI update
    const tempMsg = { ...msgData, _id: Date.now().toString(), createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
        const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msgData)
        });
        const savedMsg = await res.json();
        // Replace temp msg with saved msg (or let polling pick it up and just deduplicate)
        setMessages(prev => prev.map(m => m._id === tempMsg._id ? savedMsg : m));
    } catch (err) {
        console.error('Send failed:', err);
    }
  };

  const markAsRead = async (messageId: string) => {
    // Optional PATCH /api/chat/messages/:id/read logic
  };

  return { messages, sendMessage, conversation, loading, markAsRead };
}
