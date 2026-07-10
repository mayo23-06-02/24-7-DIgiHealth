import { useEffect, useState, useCallback } from 'react';
import * as Ably from 'ably';
import { getAblyClient } from '@/lib/ablyClient';

/**
 * Safely leave presence without racing detach.
 * leave() returns a Promise — must always .catch() to avoid unhandled rejections.
 */
function safeLeavePresence(channel: Ably.RealtimeChannel) {
  try {
    channel.presence.unsubscribe();
  } catch {
    // ignore
  }

  const state = channel.state;
  if (state !== 'attached' && state !== 'suspended') {
    return;
  }

  channel.presence.leave().catch(() => {
    // Common when channel is already detaching / already left
  });
}

export const useAblyPresence = (userId: string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const client = getAblyClient(userId);
    let cancelled = false;

    if (
      client.connection.state === 'initialized' ||
      client.connection.state === 'disconnected'
    ) {
      client.connect();
    }

    const presenceChannel = client.channels.get('presence:global');

    const onPresenceEnter = (member: Ably.PresenceMessage) => {
      const memberUserId = member.clientId?.split('-')[0];
      if (!memberUserId) return;
      setOnlineUsers(prev => new Set(prev).add(memberUserId));
      if (memberUserId === userId) {
        setIsOnline(true);
      }
    };

    const onPresenceLeave = (member: Ably.PresenceMessage) => {
      const memberUserId = member.clientId?.split('-')[0];
      if (!memberUserId) return;
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(memberUserId);
        return next;
      });
      if (memberUserId === userId) {
        setIsOnline(false);
      }
    };

    presenceChannel.presence.subscribe('enter', onPresenceEnter);
    presenceChannel.presence.subscribe('leave', onPresenceLeave);

    presenceChannel.presence.enter({ status: 'online' }).catch(err => {
      if (!cancelled) console.warn('[Ably] Global presence enter failed:', err);
    });

    return () => {
      cancelled = true;
      safeLeavePresence(presenceChannel);
    };
  }, [userId]);

  const isUserOnline = useCallback(
    (targetUserId: string) => {
      return onlineUsers.has(targetUserId);
    },
    [onlineUsers]
  );

  return {
    onlineUsers,
    isOnline,
    isUserOnline,
  };
};
