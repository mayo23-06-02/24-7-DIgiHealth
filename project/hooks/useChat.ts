import { useState, useEffect } from 'react';

export function useChat(id: string, isConversationId: boolean = false) {
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch initial conversation info
  useEffect(() => {
    if (!id) return;
    const url = isConversationId 
      ? `/api/chat/conversations/direct/${id}`
      : `/api/chat/conversations/${id}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('Conversation fetch error:', data.error);
          setConversation(null);
        } else {
          setConversation(data);
        }
      })
      .catch(err => {
        console.error('Conversation fetch catch:', err);
        setConversation(null);
      });
  }, [id, isConversationId]);

  const fetchMessages = async (beforeDate?: string, clearCurrent: boolean = false) => {
    if (!id) return;
    if (beforeDate) setLoadingMore(true);

    const baseUrl = isConversationId 
      ? `/api/chat/messages/direct/${id}`
      : `/api/chat/messages/${id}`;

    let url = `${baseUrl}?limit=50`;
    if (beforeDate) {
      url += `&before=${beforeDate}`;
    } else if (!clearCurrent && messages.length > 0) {
      // For polling NEW messages
      const lastMsg = messages[messages.length - 1];
      url += `&after=${lastMsg.createdAt || lastMsg.timestamp}`;
    }

    try {
      const res = await fetch(url);
      const newMessages = await res.json();
      
      if (Array.isArray(newMessages)) {
        if (newMessages.length === 0 && beforeDate) {
          setHasMore(false);
        }

        setMessages(prev => {
          const base = (clearCurrent || beforeDate) ? [] : prev;
          const combined = beforeDate ? [...newMessages, ...prev] : [...base, ...newMessages];
          const seen = new Set();
          return combined.filter(msg => {
            const mid = msg._id || msg.id;
            if (seen.has(mid)) return false;
            seen.add(mid);
            return true;
          });
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Reset state and run fresh fetch on conversation ID switch
  useEffect(() => {
    if (!id) return;
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    fetchMessages(undefined, true);
  }, [id, isConversationId]);

  const loadMore = async () => {
    if (messages.length > 0 && hasMore && !loadingMore) {
      const oldestMsg = messages[0];
      await fetchMessages(oldestMsg.createdAt || oldestMsg.timestamp);
    }
  };

  const sendMessage = async (msgData: any) => {
    const tempId = Date.now().toString();
    const tempMsg = { ...msgData, _id: tempId, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
        const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msgData)
        });
        const savedMsg = await res.json();
        setMessages(prev => prev.map(m => m._id === tempId ? savedMsg : m));
    } catch (err) {
        console.error('Send failed:', err);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch('/api/chat/messages/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      });
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isRead: true } : m));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  return { messages, sendMessage, conversation, loading, loadMore, hasMore, loadingMore, markAsRead };
}
