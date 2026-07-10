import { useState, useEffect, useRef, useCallback } from "react";
import { dedupeMessages } from "@/components/chat/messageUtils";
import { notifyChatUnreadChanged } from "@/lib/chatUnread";

// Module-level cache: survives component unmount/remount and chat switches
const messageCache = new Map<string, any[]>();
const conversationCache = new Map<string, any>();

export function useChat(id: string, isConversationId: boolean = false) {
  const [messages, setMessagesState] = useState<any[]>(
    () => (id ? messageCache.get(id) ?? [] : []),
  );
  const [conversation, setConversation] = useState<any>(
    () => (id ? conversationCache.get(id) ?? null : null),
  );
  const [loading, setLoading] = useState(() => (id ? !messageCache.has(id) : false));
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idRef = useRef(id);
  useEffect(() => {
    idRef.current = id;
  }, [id]);

  // Wrapped setMessages that automatically updates the module cache for the current ID
  const setMessages = useCallback(
    (newVal: any[] | ((prev: any[]) => any[])) => {
      setMessagesState((prev) => {
        const resolved =
          typeof newVal === "function" ? (newVal as Function)(prev) : newVal;
        if (idRef.current) {
          messageCache.set(idRef.current, resolved);
        }
        return resolved;
      });
    },
    [],
  );

  // Sync conversation cache
  useEffect(() => {
    if (id && conversation) {
      conversationCache.set(id, conversation);
    }
  }, [id, conversation]);

  // Fetch conversation metadata (skip network if warm cache for this id)
  useEffect(() => {
    if (!id) {
      setConversation(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const cached = conversationCache.get(id);
    if (cached) {
      setConversation(cached);
    }

    const url = isConversationId
      ? `/api/chat/conversations/direct/${id}`
      : `/api/chat/conversations/${id}`;

    // Always revalidate in background; only block UI when no cache
    fetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          if (!cached) {
            console.error("Conversation fetch error:", data.error || res.status);
            setConversation(null);
            setError(data.error || "Failed to load conversation");
          }
        } else {
          setConversation(data);
          conversationCache.set(id, data);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          console.error("Conversation fetch catch:", err);
          setConversation(null);
          setError("Failed to load conversation");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, isConversationId]);

  const fetchMessages = useCallback(
    async (beforeDate?: string, clearCurrent: boolean = false) => {
      if (!id) return;
      if (beforeDate) setLoadingMore(true);

      const baseUrl = isConversationId
        ? `/api/chat/messages/direct/${id}`
        : `/api/chat/messages/${id}`;

      let url = `${baseUrl}?limit=50`;
      if (beforeDate) {
        url += `&before=${encodeURIComponent(beforeDate)}`;
      } else if (!clearCurrent) {
        // Incremental sync only when we already have messages cached
        const cached = messageCache.get(id) ?? [];
        if (cached.length > 0) {
          const lastMsg = cached[cached.length - 1];
          const after = lastMsg.createdAt || lastMsg.timestamp;
          if (after) {
            url += `&after=${encodeURIComponent(
              typeof after === "string" ? after : new Date(after).toISOString(),
            )}`;
          }
        }
      }

      try {
        const res = await fetch(url);
        const body = await res.json();

        if (!res.ok) {
          console.error("Messages fetch failed:", body?.error || res.status);
          setError(body?.error || "Failed to load messages");
          return;
        }

        // API must return an array — error objects used to be silently ignored
        if (!Array.isArray(body)) {
          console.error("Messages API returned non-array:", body);
          setError(body?.error || "Invalid messages response");
          return;
        }

        if (body.length === 0 && beforeDate) {
          setHasMore(false);
        }

        setMessages((prev) => {
          if (idRef.current !== id) return prev;
          const base = clearCurrent ? [] : prev;
          const combined = beforeDate
            ? [...body, ...base]
            : [...base, ...body];
          return dedupeMessages(combined);
        });
        setError(null);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setError("Failed to load messages");
      } finally {
        if (idRef.current === id) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [id, isConversationId, setMessages],
  );

  // On conversation switch: restore from cache, then re-fetch from server
  useEffect(() => {
    if (!id) {
      setMessagesState([]);
      setLoading(false);
      return;
    }

    const cached = messageCache.get(id);
    if (cached && cached.length > 0) {
      setMessagesState(cached);
      setLoading(false);
      // Background refresh for newer messages only
      fetchMessages(undefined, false);
    } else {
      setMessagesState([]);
      setLoading(true);
      setHasMore(true);
      // Full initial load — never use after= on first paint
      fetchMessages(undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isConversationId]);

  // When opening a conversation, mark this thread's inbound messages as read
  // so the header chat-badge drops by 1 for this chat only.
  useEffect(() => {
    if (loading) return;
    const conversationObjectId =
      (isConversationId ? id : null) ||
      conversation?._id?.toString?.() ||
      conversation?._id;
    if (!conversationObjectId) return;

    let cancelled = false;
    // Short delay so first paint isn't blocked; fire-and-forget
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/chat/messages/read", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: conversationObjectId }),
          });
          if (cancelled) return;
          if (res.ok) {
            setMessages((prev) =>
              prev.map((m) => (m.isRead ? m : { ...m, isRead: true })),
            );
            notifyChatUnreadChanged();
          }
        } catch {
          /* silent */
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [id, isConversationId, loading, conversation?._id, setMessages]);

  const loadMore = async () => {
    const cached = messageCache.get(id) ?? messages;
    if (cached.length > 0 && hasMore && !loadingMore) {
      const oldestMsg = cached[0];
      await fetchMessages(oldestMsg.createdAt || oldestMsg.timestamp);
    }
  };

  const sendMessage = async (msgData: any) => {
    const tempId = Date.now().toString();
    const tempMsg = {
      ...msgData,
      _id: tempId,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgData),
      });
      const savedMsg = await res.json();
      if (!res.ok) {
        console.error("Send failed:", savedMsg?.error || res.status);
        return null;
      }
      const normalized = {
        ...savedMsg,
        _id: savedMsg._id?.toString?.() ?? savedMsg._id,
        senderId: savedMsg.senderId?.toString?.() ?? savedMsg.senderId,
        receiverId: savedMsg.receiverId?.toString?.() ?? savedMsg.receiverId,
        conversationId:
          savedMsg.conversationId?.toString?.() ?? savedMsg.conversationId,
      };
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? normalized : m)),
      );
      return normalized;
    } catch (err) {
      console.error("Send failed:", err);
      return null;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch("/api/chat/messages/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId) ? { ...m, isRead: true } : m,
        ),
      );
      notifyChatUnreadChanged();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  /** Mark every unread message in this conversation as read (for the current user). */
  const markConversationRead = useCallback(async () => {
    const conversationObjectId =
      (isConversationId ? id : null) ||
      conversation?._id?.toString?.() ||
      conversation?._id;
    if (!conversationObjectId) return;
    try {
      await fetch("/api/chat/messages/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationObjectId }),
      });
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      notifyChatUnreadChanged();
    } catch (err) {
      console.error("Failed to mark conversation read:", err);
    }
  }, [id, isConversationId, conversation?._id, setMessages]);

  return {
    messages,
    setMessages,
    sendMessage,
    conversation,
    loading,
    loadMore,
    hasMore,
    loadingMore,
    markAsRead,
    markConversationRead,
    error,
  };
}
