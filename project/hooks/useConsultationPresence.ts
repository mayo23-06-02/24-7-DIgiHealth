"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { getAblyClient } from "@/lib/ablyClient";
import { ABLY_CONFIG, getConsultationChannel } from "@/config/ably-config";

export interface ConsultationPresence {
  /** Someone other than us is in the lobby or the room. */
  otherPresent: boolean;
  /** False when realtime isn't configured — callers should hide the indicator. */
  available: boolean;
}

/**
 * Who else is waiting on this consultation.
 *
 * This is the honest replacement for ringing. A ring answers "will you pick
 * up?", which is the wrong question for an appointment both people already
 * committed to; the question they actually have is "has the other one arrived
 * yet?" — and until now nothing in the product answered it.
 *
 * Presence is best-effort by design. If Ably is disabled or the channel won't
 * attach, `available` goes false and the UI simply omits the line, rather than
 * claiming that nobody is there.
 */
export function useConsultationPresence({
  consultationId,
  enabled,
}: {
  consultationId: string;
  enabled: boolean;
}): ConsultationPresence {
  const { user } = useAuthContext();
  const [otherPresent, setOtherPresent] = useState(false);
  const [available, setAvailable] = useState(false);

  /**
   * Whether presence is even applicable right now. Derived rather than stored,
   * so switching it off is a render, not a state update inside an effect.
   */
  const tracking = Boolean(
    enabled && user && consultationId && ABLY_CONFIG.enabled,
  );

  useEffect(() => {
    if (!tracking || !user) return;

    let cancelled = false;
    let channel: ReturnType<
      ReturnType<typeof getAblyClient>["channels"]["get"]
    > | null = null;

    const recount = async () => {
      if (!channel || cancelled) return;
      try {
        const members = await channel.presence.get();
        if (cancelled) return;
        setOtherPresent(members.some((m) => String(m.clientId) !== String(user.id)));
      } catch {
        /* a failed read leaves the last known answer in place */
      }
    };

    try {
      const client = getAblyClient(user.id);
      client.connect();
      channel = client.channels.get(getConsultationChannel(consultationId));

      void channel.presence.subscribe(["enter", "leave", "present", "update"], () => {
        void recount();
      });

      void channel.presence
        .enter({ role: user.role })
        .then(() => {
          if (cancelled) return;
          setAvailable(true);
          void recount();
        })
        .catch(() => {
          if (!cancelled) setAvailable(false);
        });
    } catch {
      // `available` is already false until a successful enter flips it, so
      // there is nothing to unwind here.
    }

    return () => {
      cancelled = true;
      // Resetting here rather than in the effect body: a cleanup is the right
      // place to unwind state, and it keeps the "not tracking" case a pure
      // render instead of a cascading update.
      setAvailable(false);
      setOtherPresent(false);
      // Leaving explicitly rather than waiting for the connection to drop, so
      // the other party sees you go the moment you close the tab.
      void channel?.presence.leave().catch(() => {});
      try {
        channel?.presence.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [tracking, user, consultationId]);

  return {
    otherPresent: tracking && otherPresent,
    available: tracking && available,
  };
}
