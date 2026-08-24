import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import { connectToDatabase } from '@/lib/mongodb';
import Conversation from '@/lib/models/Conversation';
import { getUserCallChannel } from '@/config/ably-config';

export async function GET(req: NextRequest) {
  return handleAuth(req);
}

export async function POST(req: NextRequest) {
  return handleAuth(req);
}

/**
 * Issue an Ably token scoped to the caller.
 *
 * This endpoint previously took `clientId` from a query parameter, performed no
 * authentication, and returned a 24-hour token carrying
 * `conversation:*` → subscribe/publish/history. Anyone who could reach the URL
 * could therefore read every patient–practitioner conversation on the platform
 * and post messages into any of them. On a telehealth product that is direct
 * disclosure of clinical information.
 *
 * Now: the caller must have a session, the token's `clientId` is their own user
 * id (never a value they supplied), and the capability lists only the
 * conversations they are actually a participant in.
 */
async function handleAuth(_req: NextRequest) {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.error('Missing ABLY_API_KEY');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Conversations this user is a party to. The ObjectId guard installed at
    // the connection chokepoint makes this match nothing (rather than throw)
    // for Postgres-native ids, so those accounts simply get no conversation
    // channels instead of a 500.
    const conversations = await Conversation.find({
      $or: [{ patientId: user.userId }, { practitionerId: user.userId }],
    })
      .select('_id')
      .lean();

    const capability: Record<string, string[]> = {
      // Presence is a platform-wide online indicator and carries no clinical
      // content, so it stays global — but subscribe/presence only, never publish.
      'presence:global': ['subscribe', 'presence'],
      // Ring channel for this user alone. Call invitations are pushed here,
      // which is what replaces polling /api/chat/call/active.
      [getUserCallChannel(user.userId)]: ['subscribe'],
    };

    for (const c of conversations) {
      capability[`conversation:${String((c as { _id: unknown })._id)}`] = [
        'subscribe',
        'publish',
        'presence',
        'history',
      ];
    }

    const ably = new Ably.Rest(apiKey);
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.userId,
      capability,
      // Short-lived, because the capability is a snapshot of the user's
      // conversations at issue time. The SDK re-requests from this same
      // authUrl on expiry, which is also how a newly created conversation
      // becomes reachable.
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('Ably auth error:', error);
    return NextResponse.json({ error: 'Token creation failed' }, { status: 500 });
  }
}
