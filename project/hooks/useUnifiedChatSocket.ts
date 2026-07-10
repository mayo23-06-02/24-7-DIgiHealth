import { useEffect, useState, useCallback, useRef } from "react";
import * as Ably from "ably";
import { getSocket } from "@/lib/socket";
import { ChatMessage } from "@/components/chat/types";
import { shouldUserUseAbly } from "@/config/ably-config";
import { getAblyClient } from "@/lib/ablyClient";
import {
  safeChannelSubscribe,
  safeEnterPresence,
  safePresenceSubscribe,
  safeReleaseChannel,
  swallowAblyPromise,
} from "@/lib/ablyChannelCleanup";

export const useUnifiedChatSocket = (
  conversationId: string | null,
  currentUserId: string | null,
  options: {
    onNewMessage?: (message: ChatMessage) => void;
    onMessageSent?: (message: ChatMessage & { clientId?: string }) => void;
    onMessageRead?: (data: { messageId: string; readAt: string }) => void;
    onUserOnline?: (userId: string) => void;
    onUserOffline?: (userId: string) => void;
  } = {}
) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("initializing");
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const optionsRef = useRef(options);
  const [useAbly, setUseAbly] = useState(false);

  optionsRef.current = options;

  // Determine which system to use
  useEffect(() => {
    if (currentUserId) {
      const shouldUseAblyForUser = shouldUserUseAbly(currentUserId);
      setUseAbly(shouldUseAblyForUser);
      console.log(
        `Using ${shouldUseAblyForUser ? "Ably" : "Socket.IO"} for user ${currentUserId}`
      );
    }
  }, [currentUserId]);

  // Ably implementation
  useEffect(() => {
    if (!useAbly || !conversationId || !currentUserId) return;

    const client = getAblyClient(currentUserId);
    let cancelled = false;

    if (
      client.connection.state === "initialized" ||
      client.connection.state === "disconnected"
    ) {
      client.connect();
    }

    const onConnected = () => {
      setIsConnected(true);
      setConnectionState("connected");
    };

    const onDisconnected = () => {
      setIsConnected(false);
      setConnectionState("disconnected");
    };

    const onFailed = (error: unknown) => {
      console.error("Ably connection failed:", error);
      setConnectionState("failed");
    };

    client.connection.on("connected", onConnected);
    client.connection.on("disconnected", onDisconnected);
    client.connection.on("failed", onFailed);

    if (client.connection.state === "connected") {
      onConnected();
    }

    const channelName = `conversation:${conversationId}`;
    let channel: Ably.RealtimeChannel;
    try {
      channel = client.channels.get(channelName, {
        attachOnSubscribe: false,
      } as Ably.ChannelOptions);
    } catch {
      channel = client.channels.get(channelName);
    }
    channelRef.current = channel;

    const onNewMessage = (msg: Ably.Message) => {
      if (cancelled) return;
      if (msg.data?.conversationId === conversationId) {
        optionsRef.current.onNewMessage?.(msg.data);
      }
    };

    const onMessageSent = (msg: Ably.Message) => {
      if (cancelled) return;
      optionsRef.current.onMessageSent?.(msg.data);
    };

    const onMessageRead = (msg: Ably.Message) => {
      if (cancelled) return;
      optionsRef.current.onMessageRead?.(msg.data);
    };

    const onTypingStart = (msg: Ably.Message) => {
      if (cancelled) return;
      if (msg.data?.userId !== currentUserId) {
        setTypingUsers((prev) => new Set(prev).add(msg.data.userId));
      }
    };

    const onTypingStop = (msg: Ably.Message) => {
      if (cancelled) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(msg.data.userId);
        return next;
      });
    };

    const onPresenceEnter = (member: Ably.PresenceMessage) => {
      if (cancelled) return;
      const userId = member.clientId?.split("-")[0];
      if (userId && userId !== currentUserId) {
        optionsRef.current.onUserOnline?.(userId);
      }
    };

    const onPresenceLeave = (member: Ably.PresenceMessage) => {
      if (cancelled) return;
      const userId = member.clientId?.split("-")[0];
      if (userId && userId !== currentUserId) {
        optionsRef.current.onUserOffline?.(userId);
      }
    };

    safeChannelSubscribe(channel, "new:message", onNewMessage);
    safeChannelSubscribe(channel, "message:sent", onMessageSent);
    safeChannelSubscribe(channel, "message:read", onMessageRead);
    safeChannelSubscribe(channel, "typing:start", onTypingStart);
    safeChannelSubscribe(channel, "typing:stop", onTypingStop);
    safePresenceSubscribe(channel, "enter", onPresenceEnter);
    safePresenceSubscribe(channel, "leave", onPresenceLeave);

    try {
      swallowAblyPromise(channel.attach());
    } catch {
      // ignore
    }

    safeEnterPresence(channel, { status: "online" }, () => cancelled);

    return () => {
      cancelled = true;
      channelRef.current = null;
      client.connection.off("connected", onConnected);
      client.connection.off("disconnected", onDisconnected);
      client.connection.off("failed", onFailed);
      try {
        channel.unsubscribe("new:message", onNewMessage);
        channel.unsubscribe("message:sent", onMessageSent);
        channel.unsubscribe("message:read", onMessageRead);
        channel.unsubscribe("typing:start", onTypingStart);
        channel.unsubscribe("typing:stop", onTypingStop);
      } catch {
        // ignore
      }
      try {
        channel.presence.unsubscribe("enter", onPresenceEnter);
        channel.presence.unsubscribe("leave", onPresenceLeave);
      } catch {
        // ignore
      }
      safeReleaseChannel(channel);
      setTypingUsers(new Set());
    };
  }, [useAbly, conversationId, currentUserId]);

  // Socket.IO implementation (fallback)
  useEffect(() => {
    if (useAbly || !conversationId || !currentUserId) return;

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      setConnectionState("connected");
      socket.emit("join:conversation", conversationId);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionState("disconnected");
    };

    const onNewMsg = (message: ChatMessage & { conversationId?: string }) => {
      if (message.conversationId?.toString() === conversationId) {
        optionsRef.current.onNewMessage?.(message);
      }
    };

    const onMsgSent = (message: ChatMessage & { clientId?: string }) => {
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

    const onMsgRead = ({
      messageId,
      readAt,
    }: {
      messageId: string;
      readAt: string;
    }) => {
      optionsRef.current.onMessageRead?.({ messageId, readAt });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new:message", onNewMsg);
    socket.on("message:sent", onMsgSent);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:read", onMsgRead);

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
      setTypingUsers(new Set());
    };
  }, [useAbly, conversationId, currentUserId]);

  // Send message (works with both systems)
  const sendMessage = useCallback(async (data: unknown): Promise<boolean> => {
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        console.error("REST send failed", res.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error("sendMessage error", error);
      return false;
    }
  }, []);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (useAbly) {
      channelRef.current
        ?.publish("typing:start", { userId: currentUserId })
        .catch(() => {});
    } else if (socketRef.current?.connected) {
      socketRef.current.emit("typing:start", conversationId);
    }
  }, [useAbly, currentUserId, conversationId]);

  const stopTyping = useCallback(() => {
    if (useAbly) {
      channelRef.current
        ?.publish("typing:stop", { userId: currentUserId })
        .catch(() => {});
    } else if (socketRef.current?.connected) {
      socketRef.current.emit("typing:stop", conversationId);
    }
  }, [useAbly, currentUserId, conversationId]);

  // Read receipts
  const markAsRead = useCallback(
    (messageId: string) => {
      if (useAbly) {
        channelRef.current
          ?.publish("message:read", {
            messageId,
            readAt: new Date().toISOString(),
          })
          .catch(() => {});
      } else if (socketRef.current?.connected) {
        socketRef.current.emit("message:read", { messageId, conversationId });
      }
    },
    [useAbly, conversationId]
  );

  return {
    typingUsers,
    isConnected,
    connectionState,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    useAbly,
  };
};
