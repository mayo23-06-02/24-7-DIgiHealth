import { useState, useEffect, useRef, useCallback } from 'react';

// Module-level cache: survives component unmount/remount and chat switches
const messageCache = new Map<string, any[]>();
const conversationCache = new Map<string, any>();

export function useChat(id: string, isConversationId: boolean = false) {
  const [messages, setMessagesState] = useState<any[]>(() => messageCache.get(id) ?? []);
  const [conversation, setConversation] = useState<any>(() => conversationCache.get(id) ?? null);
  const [loading, setLoading] = useState(() => !conversationCache.has(id));
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const idRef = useRef(id);
  useEffect(() => {
    idRef.current = id;
  }, [id]);

  // Wrapped setMessages that automatically updates the module cache for the current ID
  const setMessages = useCallback((newVal: any[] | ((prev: any[]) => any[])) => {
    setMessagesState(prev => {
      const resolved = typeof newVal === 'function' ? (newVal as Function)(prev) : newVal;
      if (idRef.current) {
        messageCache.set(idRef.current, resolved);
      }
      return resolved;
    });
  }, []);

  // Sync conversation cache
  useEffect(() => {
    if (id && conversation) {
      conversationCache.set(id, conversation);
    }
  }, [id, conversation]);

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
          conversationCache.set(id, data);
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
    } else if (!clearCurrent) {
      const cached = messageCache.get(id) ?? [];
      if (cached.length > 0) {
        const lastMsg = cached[cached.length - 1];
        url += `&after=${lastMsg.createdAt || lastMsg.timestamp}`;
      }
    }

    try {
      const res = await fetch(url);
      const newMessages = await res.json();

      if (Array.isArray(newMessages)) {
        if (newMessages.length === 0 && beforeDate) {
          setHasMore(false);
        }

        setMessages(prev => {
          if (idRef.current !== id) return prev;
          const base = clearCurrent ? [] : prev;
          const combined = beforeDate ? [...newMessages, ...base] : [...base, ...newMessages];
          const seen = new Set<string>();
          return combined.filter(msg => {
            const mid = msg._id || msg.id;
            if (!mid) return true;
            if (seen.has(mid)) return false;
            seen.add(mid);
            return true;
          });
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (idRef.current === id) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // On conversation switch: restore from cache immediately, then re-validate in background
  useEffect(() => {
    if (!id) return;

    const cached = messageCache.get(id);
    if (cached && cached.length > 0) {
      setMessagesState(cached);
      setLoading(false);
    } else {
      setMessagesState([]);
      setLoading(true);
    }

    setHasMore(true);
    fetchMessages(undefined, !cached || cached.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isConversationId]);

  const loadMore = async () => {
    const cached = messageCache.get(id) ?? messages;
    if (cached.length > 0 && hasMore && !loadingMore) {
      const oldestMsg = cached[0];
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

  return { messages, setMessages, sendMessage, conversation, loading, loadMore, hasMore, loadingMore, markAsRead };
}
