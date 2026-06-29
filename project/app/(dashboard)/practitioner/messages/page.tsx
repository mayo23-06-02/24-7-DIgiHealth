"use client";

import MessagesView, {
  ConversationContact,
} from "@/components/chat/MessagesView";
import CallWrapper from "@/components/providers/CallWrapper";

export default function PractitionerMessagesPage() {
  const fetchEnrichedContacts = async (
    existingConvs: any[],
  ): Promise<ConversationContact[]> => {
    const convData: ConversationContact[] = [
      ...existingConvs.map((c) => ({
        ...c,
        contactId: c.contactId || c.patientId, // for practitioner, the other person is patient
        contactName: c.contactName || c.doctor, // backend gives 'doctor' arbitrarily in backup route mapping
        tab: "contacts",
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
  };

  return (
    <CallWrapper>
      <MessagesView
        pageTitle="Messages"
        pageSubtitle="Secure communication with your patients."
        emptyStateTitle="No Active Channels"
        emptyStateDesc="Select a patient from your clinical list to continue Secure Direct Messaging."
        fetchEnrichedContacts={fetchEnrichedContacts}
      />
    </CallWrapper>
  );
}
