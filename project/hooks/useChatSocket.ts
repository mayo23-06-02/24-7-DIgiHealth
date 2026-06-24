import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { IMessage } from "@/lib/models/Message";

export const useChatSocket = (conversationId: string | null, currentUserId: string | null) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    setMessages([]);
    setTypingUsers(new Set());
    if (!conversationId || !currentUserId) return;

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join:conversation", conversationId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("new:message", (message: IMessage) => {
      if (message.conversationId.toString() === conversationId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => (m._id || (m as any).id) === (message._id || (message as any).id))) return prev;
          return [...prev, message];
        });
      }
    });

    socket.on("message:sent", (message: IMessage) => {
      setMessages((prev) => {
        if (prev.some(m => (m._id || (m as any).id) === (message._id || (message as any).id))) return prev;
        return [...prev, message];
      });
    });

    socket.on("typing:start", ({ userId }: { userId: string }) => {
      if (userId !== currentUserId) {
        setTypingUsers((prev) => new Set(prev).add(userId));
      }
    });

    socket.on("typing:stop", ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("message:read", ({ messageId, readAt }: { messageId: string, readAt: string }) => {
      setMessages((prev) => prev.map(m => 
        (m._id?.toString() || (m as any).id) === messageId 
          ? ({ ...m, isRead: true, readAt: new Date(readAt) } as any) 
          : m
      ));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new:message");
      socket.off("message:sent");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("message:read");
    };
  }, [conversationId, currentUserId]);

  const sendMessage = useCallback((data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("send:message", {
        ...data,
        conversationId,
      });
      return true;
    }
    return false;
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit("typing:start", conversationId);
    }
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit("typing:stop", conversationId);
    }
  }, [conversationId]);

  const markAsRead = useCallback((messageId: string) => {
    if (socketRef.current?.connected && conversationId) {
      socketRef.current.emit("message:read", { messageId, conversationId });
    }
  }, [conversationId]);

  return {
    messages,
    setMessages,
    typingUsers,
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead
  };
};
