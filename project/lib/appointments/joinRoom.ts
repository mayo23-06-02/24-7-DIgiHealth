import { toast } from "react-hot-toast";

interface GoToAppointmentRoomOptions {
  appointmentId: string;
  /** ISO string or Date for the appointment's scheduled start */
  scheduledStart: string | Date;
  /** The other party's user id, used to find/create the 1:1 conversation */
  contactId: string;
  /** Passed through to the lobby via query string to avoid an extra fetch there */
  contactName?: string;
  contactAvatar?: string;
  role: "patient" | "practitioner";
  router: { push: (href: string) => void };
}

/**
 * Shared entry point for "Join Room" / "Wait in Lobby" actions.
 * Before the scheduled start time, routes into the waiting lobby.
 * At or after start time, jumps straight into the chatroom/video call
 * (covers late joins going directly to the chatroom).
 */
export async function goToAppointmentRoom({
  appointmentId,
  scheduledStart,
  contactId,
  contactName,
  contactAvatar,
  role,
  router,
}: GoToAppointmentRoomOptions): Promise<void> {
  const start = new Date(scheduledStart);
  const now = new Date();

  if (isNaN(start.getTime()) || now >= start) {
    await joinChatroomNow({ contactId, role, router });
    return;
  }

  const qs = new URLSearchParams({
    contactId,
    start: start.toISOString(),
  });
  if (contactName) qs.set("name", contactName);
  if (contactAvatar) qs.set("avatar", contactAvatar);
  router.push(`/${role}/lobby/${appointmentId}?${qs.toString()}`);
}

/**
 * Finds/creates the conversation with the other party and navigates
 * straight into the video chatroom.
 */
export async function joinChatroomNow({
  contactId,
  role,
  router,
}: {
  contactId: string;
  role: "patient" | "practitioner";
  router: { push: (href: string) => void };
}): Promise<void> {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    const data = await res.json();
    if (res.ok && data.conversationId) {
      router.push(`/${role}/messages?chatId=${data.conversationId}&join=video`);
    } else {
      toast.error("Unable to join consultation room");
    }
  } catch {
    toast.error("Unable to join consultation room");
  }
}
