"use client";

import { useCallback } from "react";
import MessagesView, {
  ConversationContact,
} from "@/components/chat/MessagesView";

export default function PractitionerMessagesPage() {
  const fetchEnrichedContacts = useCallback(async (
    existingConvs: any[],
  ): Promise<ConversationContact[]> => {
    const convData: ConversationContact[] = [
      ...existingConvs.map((c) => ({
        ...c,
        id: String(c.id || c._id || ""),
        // For practitioner, the other party is the patient
        contactId: String(c.contactId || c.patientId || ""),
        contactName: c.contactName || c.doctor || "Patient",
        tab: "contacts" as const,
      })),
    ];

    try {
      const patientRes = await fetch("/api/practitioner/patients");
      if (patientRes.ok) {
        const payload = await patientRes.json();
        const patientData = payload.data || [];

        patientData.forEach((p: any) => {
          const hasConv = convData.find(
            (c) => c.contactId === p.id || c.contactName === p.fullName,
          );

          if (!hasConv) {
            convData.push({
              isPlaceholder: true,
              id: `new-${p.id}`,
              contactId: p.id,
              contactName: p.fullName,
              avatar: `https://ui-avatars.com/api/?name=${p.fullName.replace(" ", "+")}&background=4493b8&color=fff`,
              lastMessage: "Start chatting",
              timestamp: "",
              unread: 0,
              online: false, // We could pull online status if the API gave it
              tab: "contacts",
            });
          } else {
            hasConv.tab = "contacts";
          }
        });
      }
    } catch (err) {
      console.error("Failed to fetch practitioner contacts", err);
    }

    return convData;
  }, []);

  // CallWrapper already wraps the dashboard layout
  return (
    <MessagesView
      pageTitle="Messages"
      pageSubtitle="Secure communication with your patients."
      emptyStateTitle="No Active Channels"
      emptyStateDesc="Select a patient from your clinical list to continue Secure Direct Messaging."
      fetchEnrichedContacts={fetchEnrichedContacts}
    />
  );
}
