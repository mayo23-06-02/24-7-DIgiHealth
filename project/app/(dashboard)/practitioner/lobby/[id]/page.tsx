"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/**
 * Legacy lobby URL.
 *
 * Reminder emails already in people's inboxes point here, so it has to keep
 * working — but the lobby is no longer a place of its own. It is one state of
 * the consultation route, which also knows how to be "too early", "live" and
 * "over". Replace rather than push, so Back doesn't land on a redirect.
 */
export default function PractitionerLobbyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const avatar = searchParams.get("avatar");
    const qs = avatar ? `?avatar=${encodeURIComponent(avatar)}` : "";
    router.replace(`/practitioner/consult/${params.id}${qs}`);
  }, [params.id, router, searchParams]);

  return null;
}
