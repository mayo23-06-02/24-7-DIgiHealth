export interface ConversationContact {
  isPlaceholder?: boolean;
  id: string;
  contactId: string;
  contactName: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  tab: "contacts" | "pending";
  practitionerId?: string;
}