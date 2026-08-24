import Ably from "ably";
import { getUserCallChannel, isAblyEnabled } from "@/config/ably-config";

/**
 * Server-side push for call state.
 *
 * Every signed-in client used to poll /api/chat/call/active on a timer just to
 * discover an incoming call — 31 requests in 137 idle seconds per session,
 * which is most of the platform's idle API traffic and still leaves up to a
 * full interval of ring latency. Publishing to the callee's own channel gets
 * the invitation there immediately and lets the poll drop to a slow safety net.
 *
 * Publishing is strictly best-effort: the poll is still running underneath, so
 * a failure here delays the ring rather than losing the call. It must never
 * fail the request that started the call.
 */

export type CallSignal =
  | { kind: "incoming"; callId: string; conversationId: string; consultationId?: string | null; type: string; initiatedBy: string; roomName?: string | null; roomUrl?: string | null; participantName?: string | null; participantAvatar?: string | null }
  | { kind: "ended"; callId: string }
  | { kind: "declined"; callId: string };

let rest: Ably.Rest | null = null;

function client(): Ably.Rest | null {
  if (!isAblyEnabled()) return null;
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  if (!rest) rest = new Ably.Rest(key);
  return rest;
}

/** Push a call signal to one user's ring channel. */
export async function publishCallSignal(
  userId: string,
  signal: CallSignal,
): Promise<void> {
  const c = client();
  if (!c || !userId) return;
  try {
    await c.channels.get(getUserCallChannel(userId)).publish(signal.kind, signal);
  } catch (err) {
    console.warn("[callSignals] publish failed; poller will still catch it", err);
  }
}

/** Push the same signal to several users (caller and callee). */
export async function publishCallSignalTo(
  userIds: Array<string | null | undefined>,
  signal: CallSignal,
): Promise<void> {
  const unique = [...new Set(userIds.filter((u): u is string => !!u))];
  await Promise.all(unique.map((u) => publishCallSignal(u, signal)));
}
