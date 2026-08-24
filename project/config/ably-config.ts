/**
 * Ably configuration and feature flags
 */

export const ABLY_CONFIG = {
  // Feature flag to enable/disable Ably
  enabled: process.env.NEXT_PUBLIC_ABLY_ENABLED === 'true',
  
  // Channel prefix for conversation channels
  channelPrefix: process.env.ABLY_CHANNEL_PREFIX || 'conversation',
  
  // Connection settings
  connection: {
    autoConnect: true,
    recover: true, // Automatically recover connection
    realtimeRequestTimeout: 15000, // 15 seconds
    fallbackHosts: [
      'realtime.ably.io',
      'eu-realtime.ably.io',
      'us-east-realtime.ably.io',
    ],
  },
  
  // Message history settings
  history: {
    limit: 50, // Number of messages to retrieve on reconnection
    direction: 'forwards', // Direction of history retrieval
  },
  
  // Presence settings
  presence: {
    enterOnConnect: true,
    leaveOnDisconnect: true,
  },
  
  // Retry settings
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  
  // Rate limiting
  rateLimit: {
    messagesPerMinute: 60,
    presenceUpdatesPerMinute: 30,
  },
};

/**
 * Check if Ably is enabled for the current environment
 */
export function isAblyEnabled(): boolean {
  return ABLY_CONFIG.enabled && !!process.env.ABLY_API_KEY;
}

/**
 * Get channel name for a conversation
 */
export function getConversationChannel(conversationId: string): string {
  return `${ABLY_CONFIG.channelPrefix}:${conversationId}`;
}

/**
 * Get global presence channel name
 */
export function getPresenceChannel(): string {
  return 'presence:global';
}

/**
 * Per-user "ring" channel. Call invitations are published here by the server so
 * the recipient learns about them by push, instead of every client polling
 * /api/chat/call/active on a timer.
 *
 * One channel per user, and the token capability grants subscribe on the
 * caller's own channel only — a user cannot listen in on anyone else's calls.
 */
export function getUserCallChannel(userId: string): string {
  return `calls:${userId}`;
}

/**
 * Check if we should use Ably or fallback to Socket.IO
 */
export function shouldUseAbly(): boolean {
  // Use Ably if enabled and API key is present
  if (!isAblyEnabled()) return false;
  
  // Additional checks can be added here (e.g., user percentage for A/B testing)
  return true;
}

/**
 * Get user percentage for A/B testing (0-100)
 */
export function getAblyUserPercentage(): number {
  const percentage = parseInt(process.env.NEXT_PUBLIC_ABLY_USER_PERCENTAGE || '0', 10);
  return Math.min(Math.max(percentage, 0), 100);
}

/**
 * Check if current user should use Ably (for A/B testing)
 */
export function shouldUserUseAbly(userId: string): boolean {
  if (!shouldUseAbly()) return false;
  
  const percentage = getAblyUserPercentage();
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;
  
  // Simple hash-based user assignment
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 100) < percentage;
}
