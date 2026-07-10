/** Browser event so Header can refresh the message badge when reads change. */
export const CHAT_UNREAD_EVENT = "chat:unread-updated";

export function notifyChatUnreadChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_UNREAD_EVENT));
}

/** Play the shared notification chime (best-effort; browsers may block autoplay). */
export function playMessageNotificationSound(): void {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio("/notification.m4a");
    audio.volume = 0.7;
    void audio.play().catch(() => {
      // Autoplay policies may block until user gesture
    });
  } catch {
    // ignore
  }
}
