import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface ICall extends Document {
  consultationId?: string;
  conversationId: string;
  initiatedBy: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  type: 'video' | 'voice';
  status: 'requested' | 'active' | 'ended' | 'missed' | 'declined';
  livekitRoomName?: string;
  livekitRoomUrl?: string;
  /**
   * Everyone who was actually issued a token to enter the room.
   *
   * This is what makes "did the consultation happen?" answerable. Without it,
   * a session where one party sat alone and gave up is indistinguishable from
   * one where both attended — and both were being recorded as completed.
   */
  participantUserIds: string[];
  /** Set when a practitioner explicitly declared the consultation finished. */
  endedBy?: string;
}

/**
 * At most one live call per conversation *per appointment*, enforced by the
 * database rather than by a read-then-write in the route.
 *
 * Two clients whose call buttons were pressed in the same instant both used to
 * miss the `findOne` and both `create`, producing two active Call rows for one
 * conversation. Each then looked like an "incoming call" to the other party's
 * poller, and declining either one tore down the LiveKit room both users were
 * already sitting in. The partial filter keeps the constraint to live rows, so
 * the many ended/declined rows a conversation accumulates never collide.
 *
 * `consultationId` is part of the key on purpose. A consultation's room belongs
 * to the appointment rather than to the thread, so two people may legitimately
 * hold two live rows in one conversation — two appointments, or an appointment
 * alongside an ad-hoc call. Keyed on `conversationId` alone, as this index once
 * was, the second of those rows could never be inserted: the write failed on an
 * index the caller was not even looking at, and re-reading by consultation
 * found nothing, which is the "active call vanished" dead end.
 *
 * Ad-hoc calls index as null here whether the field is missing or explicitly
 * null, so they still collapse to one live row per conversation — the original
 * guarantee, kept intact.
 */

/** Same guarantee keyed on the consultation, for scheduled-appointment sessions. */

export const Call: ModelClass<ICall> = defineModel<ICall>({
  name: 'Call', table: 'calls',
  refs: { consultationId: 'Consultation', conversationId: 'Conversation', initiatedBy: 'User', endedBy: 'User' },
});
export default Call;
