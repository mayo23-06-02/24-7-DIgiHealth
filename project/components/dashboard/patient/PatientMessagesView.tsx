"use client";

import { useCallback, useRef } from "react";
import MessagesView, {
  ConversationContact,
} from "@/components/chat/MessagesView";

export default function PatientMessagesView() {
  const cacheRef = useRef<{ docs: any[]; agenda: any[] } | null>(null);

  const fetchEnrichedContacts = useCallback(async (
    existingConvs: any[],
  ): Promise<ConversationContact[]> => {
    const convData: ConversationContact[] = [
      ...existingConvs.map((c) => ({
        ...c,
        contactId: c.contactId || c.practitionerId,
        contactName: c.contactName || c.doctor,
        tab: "contacts",
      })),
    ];

    try {
      // Use cached enrichment data if available
      let approvedDocs: any[] = [];
      let agenda: any[] = [];

      if (cacheRef.current) {
        // Reuse cached data
        approvedDocs = cacheRef.current.docs;
        agenda = cacheRef.current.agenda;
      } else {
        // Fetch and cache enrichment data
        const [docRes, agendaRes] = await Promise.all([
          fetch("/api/patient/my-doctors"),
          fetch("/api/patient/agenda")
        ]);
        
        const docData = docRes.ok ? await docRes.json() : [];
        const agendaData = agendaRes.ok ? await agendaRes.json() : [];
        
        cacheRef.current = { docs: docData, agenda: agendaData };
        approvedDocs = docData;
        agenda = agendaData;
      }

      // Process My Doctors (Approved / Favorites)
      approvedDocs.forEach((doc: any) => {
        const existing = convData.find(
          (c) => c.contactId === doc.id || c.contactName === doc.name,
        );
        if (!existing) {
          convData.push({
            isPlaceholder: true,
            id: `new-${doc.id}`,
            contactId: doc.id,
            practitionerId: doc.id, // For backward compatibility
            contactName: doc.name.startsWith("Dr.")
              ? doc.name
              : `Dr. ${doc.name}`,
            avatar:
              doc.avatarUrl ||
              `https://ui-avatars.com/api/?name=${doc.name.replace(" ", "+")}&background=4493b8&color=fff`,
            lastMessage: "Channel ready for consultation.",
            timestamp: "",
            unread: 0,
            online: doc.isOnline,
            tab: "contacts",
          });
        } else {
          existing.tab = "contacts";
        }
      });

      // Process pending requests from agenda
      const pendingRequests = agenda.filter(
        (a: any) => a.type === "doctor" && a.status === "requested",
      );

      pendingRequests.forEach((req: any) => {
        const existing = convData.find(
          (c) =>
            c.contactId === req.practitionerId || c.contactName === req.dr,
        );
        if (!existing) {
          convData.push({
            isPlaceholder: true,
            id: `pending-${req.id}`,
            contactId: req.practitionerId,
            practitionerId: req.practitionerId,
            contactName: req.dr,
            avatar:
              req.img ||
              `https://ui-avatars.com/api/?name=${req.dr.replace(" ", "+")}&background=fbbf24&color=fff`,
            lastMessage: "Request pending clinical review.",
            timestamp: "Pending",
            unread: 0,
            online: false,
            tab: "pending",
          });
        } else {
          if (!existing.tab) existing.tab = "contacts";
        }
      });
    } catch (err) {
      console.error("Failed to enrich patients contacts", err);
      // Clear cache on error to allow retry
      cacheRef.current = null;
    }

    return convData;
  }, []);

  // CallWrapper already wraps the dashboard layout — avoid double providers
  return (
    <MessagesView
      pageTitle="Secure Messages"
      pageSubtitle="Stay connected with your doctors."
      emptyStateTitle="No Messages"
      emptyStateDesc="Start a conversation from the Doctors page."
      onNewChatClick={() => (window.location.href = "/patient/doctors")}
      fetchEnrichedContacts={fetchEnrichedContacts}
    />
  );
}
