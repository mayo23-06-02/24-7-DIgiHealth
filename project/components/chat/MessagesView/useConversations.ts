import { useState, useCallback, useRef, useEffect } from "react";
import { ConversationContact } from "./types";


export function useConversations(
  fetchEnrichedContacts: (convs: any[]) => Promise<ConversationContact[]>
) {
  const [conversations, setConversations] = useState<ConversationContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const fetchConversations = useCallback(async () => {
    if (isFirstLoad.current) setIsLoading(true);
    try {
      const res = await fetch("/api/conversations");
      const data = res.ok ? await res.json() : [];
      const enriched = await fetchEnrichedContacts(data);
      setConversations(enriched);
      isFirstLoad.current = false;
      return enriched;
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchEnrichedContacts]);

  const startConversation = useCallback(async (contactId: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        return data.conversationId;
      }
    } catch {}
  }, [fetchConversations]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return { conversations, isLoading, fetchConversations, startConversation };
}