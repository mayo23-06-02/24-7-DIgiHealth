import { useEffect, useState, useCallback, useRef } from 'react';
import * as Ably from 'ably';
import { ChatMessage } from '@/components/chat/types';
import { getAblyClient } from '@/lib/ablyClient';
import {
  safeChannelSubscribe,
  safeEnterPresence,
  safePresenceSubscribe,
  safeReleaseChannel,
  swallowAblyPromise,
} from '@/lib/ablyChannelCleanup';

export const useChatSocket = (
  conversationId: string | null,
  currentUserId: string | null,
  options: {
    onNewMessage?: (message: ChatMessage) => void;
    onMessageSent?: (message: ChatMessage & { clientId?: string }) => void;
    onMessageRead?: (data: { messageId: string; readAt: string }) => void;
    onUserOnline?: (userId: string) => void;
    onUserOffline?: (userId: string) => void;
  } = {},
) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('initializing');
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ---------- Ably connection ----------
  useEffect(() => {
    if (!currentUserId) return;

    const client = getAblyClient(currentUserId);

    const onConnected = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };
    const onDisconnected = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };
    const onSuspended = () => {
      setConnectionState('suspended');
    };
    const onFailed = (error: unknown) => {
      console.error('[Ably] connection failed:', error);
      setConnectionState('failed');
      setTimeout(() => {
        try {
          client.connect();
        } catch {
          // ignore
        }
      }, 5000);
    };

    client.connection.on('connected', onConnected);
    client.connection.on('disconnected', onDisconnected);
    client.connection.on('suspended', onSuspended);
    client.connection.on('failed', onFailed);

    if (
      client.connection.state === 'initialized' ||
      client.connection.state === 'disconnected' ||
      client.connection.state === 'suspended'
    ) {
      try {
        client.connect();
      } catch {
        // ignore
      }
    } else if (client.connection.state === 'connected') {
      onConnected();
    }

    return () => {
      client.connection.off('connected', onConnected);
      client.connection.off('disconnected', onDisconnected);
      client.connection.off('suspended', onSuspended);
      client.connection.off('failed', onFailed);
    };
  }, [currentUserId]);

  // ---------- Channel subscription ----------
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const client = getAblyClient(currentUserId);
    let cancelled = false;

    const channelName = `conversation:${conversationId}`;
    // Prefer not auto-attaching on each subscribe (attach once below)
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
      const msgConvId = msg.data?.conversationId;
      if (msgConvId == null || String(msgConvId) === String(conversationId)) {
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
      const userId = member.clientId?.split('-')[0];
      if (userId && userId !== currentUserId) {
        optionsRef.current.onUserOnline?.(userId);
      }
    };
    const onPresenceLeave = (member: Ably.PresenceMessage) => {
      if (cancelled) return;
      const userId = member.clientId?.split('-')[0];
      if (userId && userId !== currentUserId) {
        optionsRef.current.onUserOffline?.(userId);
      }
    };

    // Register listeners (attachOnSubscribe: false → no attach promise per call)
    safeChannelSubscribe(channel, 'new:message', onNewMessage);
    safeChannelSubscribe(channel, 'message:sent', onMessageSent);
    safeChannelSubscribe(channel, 'message:read', onMessageRead);
    safeChannelSubscribe(channel, 'typing:start', onTypingStart);
    safeChannelSubscribe(channel, 'typing:stop', onTypingStop);
    safePresenceSubscribe(channel, 'enter', onPresenceEnter);
    safePresenceSubscribe(channel, 'leave', onPresenceLeave);

    // Single attach, always caught
    try {
      swallowAblyPromise(channel.attach());
    } catch {
      // ignore
    }

    safeEnterPresence(channel, { status: 'online' }, () => cancelled);

    return () => {
      cancelled = true;
      channelRef.current = null;
      // Unsubscribe listeners only — never detach / leave
      try {
        channel.unsubscribe('new:message', onNewMessage);
        channel.unsubscribe('message:sent', onMessageSent);
        channel.unsubscribe('message:read', onMessageRead);
        channel.unsubscribe('typing:start', onTypingStart);
        channel.unsubscribe('typing:stop', onTypingStop);
      } catch {
        // ignore
      }
      try {
        channel.presence.unsubscribe('enter', onPresenceEnter);
        channel.presence.unsubscribe('leave', onPresenceLeave);
      } catch {
        // ignore
      }
      safeReleaseChannel(channel);
      setTypingUsers(new Set());
    };
  }, [conversationId, currentUserId]);

  const sendMessage = useCallback(async (data: unknown): Promise<boolean> => {
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        console.error('REST send failed', res.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error('sendMessage error', error);
      return false;
    }
  }, []);

  const startTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || ch.state !== 'attached') return;
    swallowAblyPromise(ch.publish('typing:start', { userId: currentUserId }));
  }, [currentUserId]);

  const stopTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || ch.state !== 'attached') return;
    swallowAblyPromise(ch.publish('typing:stop', { userId: currentUserId }));
  }, [currentUserId]);

  const markAsRead = useCallback((messageId: string) => {
    const ch = channelRef.current;
    if (!ch || ch.state !== 'attached') return;
    swallowAblyPromise(
      ch.publish('message:read', {
        messageId,
        readAt: new Date().toISOString(),
      }),
    );
  }, []);

  return {
    typingUsers,
    isConnected,
    connectionState,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
};
