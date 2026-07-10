import { ChatMessage } from "./types";

/** Stable string id for a message (mongo id, client id, or empty). */
export function messageKey(msg: Pick<ChatMessage, "_id" | "id" | "clientId">): string {
  return String(msg._id ?? msg.id ?? msg.clientId ?? "");
}

function isMongoId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

/**
 * Deduplicate messages.
 * - Same _id → keep one (prefer server/mongo form)
 * - Optimistic row (_id === clientId) dropped when a server row has that clientId
 */
export function dedupeMessages<T extends ChatMessage>(messages: T[]): T[] {
  if (!messages?.length) return [];

  // Map clientId → server message key when present
  const serverByClientId = new Map<string, string>();
  for (const m of messages) {
    const key = messageKey(m);
    const cid = m.clientId ? String(m.clientId) : "";
    if (cid && key && key !== cid && isMongoId(key)) {
      serverByClientId.set(cid, key);
    }
  }

  const seen = new Set<string>();
  const result: T[] = [];

  for (const msg of messages) {
    const key = messageKey(msg);
    if (!key) {
      result.push(msg);
      continue;
    }

    // Skip optimistic placeholder if server version exists for this clientId
    if (serverByClientId.has(key) && !isMongoId(key)) {
      continue;
    }
    if (
      msg.clientId &&
      String(msg._id) === String(msg.clientId) &&
      serverByClientId.has(String(msg.clientId))
    ) {
      continue;
    }

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(msg);
  }

  return result;
}

/**
 * Upsert a realtime/server message into the list.
 * Replaces optimistic entry matching clientId; merges same _id; otherwise appends.
 */
export function upsertMessage<T extends ChatMessage>(
  prev: T[],
  incoming: T & { clientId?: string },
): T[] {
  if (!incoming) return prev;

  const inKey = messageKey(incoming);
  const clientId = incoming.clientId ? String(incoming.clientId) : "";

  // Replace optimistic message keyed by clientId
  if (clientId) {
    const idx = prev.findIndex(
      (m) =>
        String(m._id) === clientId ||
        String(m.clientId) === clientId ||
        String(m.id) === clientId,
    );
    if (idx >= 0) {
      const next = [...prev];
      next[idx] = { ...incoming, clientId: undefined } as T;
      return dedupeMessages(next);
    }
  }

  // Merge into existing server id
  if (inKey) {
    const idx = prev.findIndex((m) => messageKey(m) === inKey);
    if (idx >= 0) {
      const next = [...prev];
      next[idx] = { ...prev[idx], ...incoming } as T;
      return dedupeMessages(next);
    }
  }

  return dedupeMessages([...prev, incoming as T]);
}
