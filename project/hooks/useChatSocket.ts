import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { IMessage } from "@/lib/models/Message";

export const useChatSocket = (
  conversationId: string | null,
  currentUserId: string | null,
  options: {
    onNewMessage?: (message: IMessage) => void;
    onMessageSent?: (message: IMessage) => void;
    onMessageRead?: (data: { messageId: string; readAt: string }) => void;
  } = {}
) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);

  // Keep options in ref to avoid effect recreation if handlers change
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    setTypingUsers(new Set());
    if (!conversationId || !currentUserId) return;

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit("join:conversation", conversationId);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onNewMsg = (message: IMessage) => {
      if (message.conversationId.toString() === conversationId) {
        optionsRef.current.onNewMessage?.(message);
      }
    };

    const onMsgSent = (message: IMessage) => {
      optionsRef.current.onMessageSent?.(message);
    };

    const onTypingStart = ({ userId }: { userId: string }) => {
      if (userId !== currentUserId) {
        setTypingUsers((prev) => new Set(prev).add(userId));
      }
    };

    const onTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const onMsgRead = ({ messageId, readAt }: { messageId: string, readAt: string }) => {
      optionsRef.current.onMessageRead?.({ messageId, readAt });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new:message", onNewMsg);
    socket.on("message:sent", onMsgSent);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:read", onMsgRead);

    // If already connected
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new:message", onNewMsg);
      socket.off("message:sent", onMsgSent);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:read", onMsgRead);
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
    typingUsers,
    isConnected,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead
  };
};
