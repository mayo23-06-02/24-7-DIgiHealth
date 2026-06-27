import { useState, useEffect, useRef } from 'react';

// Module-level cache: survives component unmount/remount and chat switches
// Key: conversationId, Value: messages array
const messageCache = new Map<string, any[]>();
const conversationCache = new Map<string, any>();

export function useChat(id: string, isConversationId: boolean = false) {
  // Seed initial state from cache to prevent flash-to-empty on switch-back
  const [messages, setMessages] = useState<any[]>(() => messageCache.get(id) ?? []);
  const [conversation, setConversation] = useState<any>(() => conversationCache.get(id) ?? null);
  const [loading, setLoading] = useState(() => !conversationCache.has(id));
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Keep cache in sync whenever messages change
  useEffect(() => {
    if (id && messages.length > 0) {
      messageCache.set(id, messages);
    }
  }, [id, messages]);

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

  const idRef = useRef(id);
  idRef.current = id;

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
      // For polling NEW messages — append after the last known message
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
          // Guard against stale updates for a previously active chat
          if (idRef.current !== id) return prev;

          const base = clearCurrent ? [] : (beforeDate ? prev : prev);
          const combined = beforeDate ? [...newMessages, ...base] : [...base, ...newMessages];
          const seen = new Set<string>();
          const unique = combined.filter(msg => {
            const mid = msg._id || msg.id;
            if (!mid) return true;
            if (seen.has(mid)) return false;
            seen.add(mid);
            return true;
          });
          messageCache.set(id, unique);
          return unique;
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // On conversation switch: restore from cache immediately, then re-validate in background
  useEffect(() => {
    if (!id) return;

    // Restore from cache instantly (no flash to empty)
    const cached = messageCache.get(id);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setHasMore(true);
    // Always re-validate to get any new messages since last visit
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
    setMessages(prev => {
      const updated = [...prev, tempMsg];
      messageCache.set(id, updated);
      return updated;
    });

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
      const savedMsg = await res.json();
      setMessages(prev => {
        const updated = prev.map(m => m._id === tempId ? savedMsg : m);
        messageCache.set(id, updated);
        return updated;
      });
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
      setMessages(prev => {
        const updated = prev.map(m => m._id === messageId ? { ...m, isRead: true } : m);
        messageCache.set(id, updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  return { messages, sendMessage, conversation, loading, loadMore, hasMore, loadingMore, markAsRead };
}
