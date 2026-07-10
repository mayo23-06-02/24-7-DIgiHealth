import * as Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;
let ablyClientId: string | null = null;
let rejectionFilterInstalled = false;

/**
 * Next.js dev overlay treats Ably channel lifecycle rejections as Runtime Errors.
 * Filter only those known-benign attach/detach races so real errors still surface.
 */
function installAblyRejectionFilter(): void {
  if (rejectionFilterInstalled || typeof window === 'undefined') return;
  rejectionFilterInstalled = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      (reason && (reason.message || reason.toString?.())) || String(reason || '');

    const isBenignAblyLifecycle =
      /Attach request superseded by a subsequent detach/i.test(message) ||
      /Unable to attach; reason unknown/i.test(message) ||
      /Unable to leave presence channel while in detaching/i.test(message) ||
      /Unable to enter presence channel/i.test(message);

    if (isBenignAblyLifecycle) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

/**
 * Shared Ably Realtime client.
 * Pass a stable user id so presence / tokens identify the same client across
 * conversation switches (avoids random clientIds on every auth).
 */
export function getAblyClient(clientId?: string): Ably.Realtime {
  installAblyRejectionFilter();

  const resolvedClientId = clientId || undefined;

  // Recreate if user identity changed (e.g. account switch)
  if (
    ablyClient &&
    resolvedClientId &&
    ablyClientId &&
    ablyClientId !== resolvedClientId
  ) {
    try {
      ablyClient.close();
    } catch {
      // ignore
    }
    ablyClient = null;
    ablyClientId = null;
  }

  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: '/api/ably/auth',
      authParams: resolvedClientId ? { clientId: resolvedClientId } : undefined,
      clientId: resolvedClientId,
      autoConnect: false,
      // Prefer not recovering across full reloads with a mismatched client
      recover: (_, cb) => cb(true),
    });
    ablyClientId = resolvedClientId ?? null;
  }

  return ablyClient;
}

export function clearAblyClient(): void {
  if (ablyClient) {
    try {
      ablyClient.close();
    } catch {
      // ignore
    }
    ablyClient = null;
    ablyClientId = null;
  }
}
