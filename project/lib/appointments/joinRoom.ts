interface GoToAppointmentRoomOptions {
  appointmentId: string;
  contactAvatar?: string;
  role: "patient" | "practitioner";
  router: { push: (href: string) => void };
  /** Called before navigating, so the caller can light a progress bar. */
  onStart?: () => void;
  /**
   * Accepted for call-site compatibility. Nothing here can fail any more, so it
   * is never invoked — the destination resolves its own state.
   */
  onSettle?: () => void;
}

/**
 * Send someone to their consultation.
 *
 * This used to make the decision itself: compare the clock to the start time,
 * then either route to a lobby or resolve a conversation and jump into the
 * chatroom. That put a time-sensitive branch — and a network round-trip — in
 * front of every entry point, and it meant the *caller* decided which state the
 * session was in, using the device's own clock, before the server had said
 * anything.
 *
 * Now there is one destination and it decides for itself. Too early, waiting,
 * live, or long over: the consult route renders the right thing, so every entry
 * point is a plain link and there is nothing to get wrong.
 */
export function goToAppointmentRoom({
  appointmentId,
  contactAvatar,
  role,
  router,
  onStart,
}: GoToAppointmentRoomOptions): void {
  onStart?.();
  const qs = contactAvatar
    ? `?avatar=${encodeURIComponent(contactAvatar)}`
    : "";
  router.push(`/${role}/consult/${appointmentId}${qs}`);
}
