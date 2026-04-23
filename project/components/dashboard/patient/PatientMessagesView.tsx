"use client";

import React from "react";
import MessagesView, { ConversationContact } from "@/components/chat/MessagesView";

export default function PatientMessagesView() {
  const fetchEnrichedContacts = async (existingConvs: any[]): Promise<ConversationContact[]> => {
    const convData: ConversationContact[] = [...existingConvs.map(c => ({
      ...c,
      contactId: c.contactId || c.practitionerId,
      contactName: c.contactName || c.doctor,
      tab: 'contacts'
    }))];

    try {
      // Fetch My Doctors (Approved / Favorites)
      const docRes = await fetch("/api/patient/my-doctors");
      if (docRes.ok) {
        const approvedDocs = await docRes.json();
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
              contactName: doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`,
              avatar: doc.avatarUrl || `https://ui-avatars.com/api/?name=${doc.name.replace(" ", "+")}&background=4493b8&color=fff`,
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
      }

      // Fetch Pending Requests from Agenda
      const agendaRes = await fetch("/api/patient/agenda");
      if (agendaRes.ok) {
        const agenda = await agendaRes.json();
        const pendingRequests = agenda.filter(
          (a: any) => a.type === "doctor" && a.status === "requested",
        );

        pendingRequests.forEach((req: any) => {
          const existing = convData.find(
            (c) => c.contactId === req.practitionerId || c.contactName === req.dr,
          );
          if (!existing) {
            convData.push({
              isPlaceholder: true,
              id: `pending-${req.id}`,
              contactId: req.practitionerId,
              practitionerId: req.practitionerId,
              contactName: req.dr,
              avatar: req.img || `https://ui-avatars.com/api/?name=${req.dr.replace(" ", "+")}&background=fbbf24&color=fff`,
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
      }
    } catch (err) {
      console.error("Failed to enrich patients contacts", err);
    }

    return convData;
  };

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
