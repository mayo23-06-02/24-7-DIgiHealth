import { useState, useCallback, useRef, useEffect } from "react";
import { ConversationContact } from "./types";
import { Conversation } from "../types";

function mapBasicContacts(convs: any[]): ConversationContact[] {
  return (Array.isArray(convs) ? convs : []).map((c) => ({
    ...c,
    id: String(c.id || c._id || ""),
    contactId: String(c.contactId || c.practitionerId || ""),
    contactName: c.contactName || c.doctor || "Unknown",
    avatar: c.avatar || "",
    lastMessage: c.lastMessage || "No messages yet.",
    timestamp: c.timestamp || "",
    unread: c.unread || 0,
    online: !!c.online,
    tab: (c.tab as "contacts" | "pending") || "contacts",
    practitionerId: c.practitionerId,
    isPlaceholder: !!c.isPlaceholder,
  }));
}

export function useConversations(
  fetchEnrichedContacts: (
    convs: Conversation[],
  ) => Promise<ConversationContact[]>,
) {
  const [conversations, setConversations] = useState<ConversationContact[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const enrichingRef = useRef(false);
  const abortRef = useRef(0);

  const fetchConversationsStable = useCallback(
    async (opts?: { enrich?: boolean }) => {
      const runId = ++abortRef.current;
      const shouldEnrich = opts?.enrich !== false;
      if (isFirstLoad.current) setIsLoading(true);

      try {
        const res = await fetch("/api/conversations", {
          cache: isFirstLoad.current ? "no-store" : "default",
        });
        const data = res.ok ? await res.json() : [];
        if (runId !== abortRef.current) return [];

        const basic = mapBasicContacts(data);
        setConversations(basic);
        isFirstLoad.current = false;
        setIsLoading(false);

        if (shouldEnrich && !enrichingRef.current) {
          enrichingRef.current = true;
          try {
            const enriched = await fetchEnrichedContacts(data);
            if (runId === abortRef.current && Array.isArray(enriched)) {
              setConversations(mapBasicContacts(enriched));
            }
            return enriched || basic;
          } catch {
            return basic;
          } finally {
            enrichingRef.current = false;
          }
        }
        return basic;
      } catch {
        if (runId === abortRef.current) setIsLoading(false);
        return [];
      }
    },
    [fetchEnrichedContacts],
  );

  const startConversation = useCallback(
    async (contactId: string) => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId }),
        });
        if (res.ok) {
          const data = await res.json();
          // Don't block navigation on a full list refresh
          void fetchConversationsStable({ enrich: false });
          return data.conversationId;
        }
      } catch {
        /* silent */
      }
    },
    [fetchConversationsStable],
  );

  // Initial load (with enrichment) + slower background poll (no re-enrich every time)
  useEffect(() => {
    void fetchConversationsStable({ enrich: true });
    const interval = setInterval(() => {
      void fetchConversationsStable({ enrich: false });
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchConversationsStable]);

  return {
    conversations,
    isLoading,
    fetchConversations: fetchConversationsStable,
    startConversation,
  };
}
