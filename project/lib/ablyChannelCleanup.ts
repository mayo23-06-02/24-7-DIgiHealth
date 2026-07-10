import type * as Ably from 'ably';

/**
 * Ably RealtimeChannel.subscribe() / presence.subscribe() return the channel
 * attach() Promise. If that attach is later aborted (Strict Mode remount,
 * conversation switch), the Promise rejects with:
 *   "Attach request superseded by a subsequent detach request"
 *   "Unable to attach; reason unknown; state = detached"
 *
 * Always swallow those rejections so Next.js does not show a Runtime Error.
 */
export function swallowAblyPromise(
  value: Promise<unknown> | void | null | undefined,
): void {
  if (value != null && typeof (value as Promise<unknown>).then === 'function') {
    void (value as Promise<unknown>).then(undefined, () => {
      /* ignore attach/detach/presence lifecycle rejections */
    });
  }
}

/**
 * Remove our listeners only. Never call detach() or presence.leave() here —
 * those race with in-flight attach() from subscribe().
 */
export function safeReleaseChannel(channel: Ably.RealtimeChannel | null | undefined): void {
  if (!channel) return;

  try {
    // Remove all channel message listeners registered by this app instance
    channel.unsubscribe();
  } catch {
    // ignore
  }

  try {
    channel.presence.unsubscribe();
  } catch {
    // ignore
  }
}

/**
 * Enter presence after attach. Never leaves an unhandled rejection.
 */
export function safeEnterPresence(
  channel: Ably.RealtimeChannel,
  data?: Record<string, unknown> | string | null,
  isCancelled?: () => boolean,
): void {
  const enter = () => {
    if (isCancelled?.()) return;
    if (channel.state !== 'attached') return;
    try {
      swallowAblyPromise(channel.presence.enter(data as object));
    } catch {
      // ignore
    }
  };

  if (channel.state === 'attached') {
    enter();
    return;
  }

  try {
    channel.once('attached', () => {
      if (isCancelled?.()) return;
      enter();
    });
  } catch {
    // ignore
  }
}

/**
 * Subscribe to a channel event and always catch the attach Promise.
 */
export function safeChannelSubscribe(
  channel: Ably.RealtimeChannel,
  event: string,
  listener: (msg: Ably.Message) => void,
): void {
  try {
    // ably-js v2: subscribe() returns Promise from attach()
    swallowAblyPromise(
      channel.subscribe(event, listener) as unknown as Promise<unknown>,
    );
  } catch {
    // ignore sync errors
  }
}

/**
 * Subscribe to presence and always catch the attach Promise.
 */
export function safePresenceSubscribe(
  channel: Ably.RealtimeChannel,
  event: 'enter' | 'leave' | 'update' | 'present',
  listener: (member: Ably.PresenceMessage) => void,
): void {
  try {
    swallowAblyPromise(
      channel.presence.subscribe(event, listener) as unknown as Promise<unknown>,
    );
  } catch {
    // ignore
  }
}
