import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';

export async function GET(req: NextRequest) {
  return handleAuth(req);
}

export async function POST(req: NextRequest) {
  return handleAuth(req);
}

async function handleAuth(req: NextRequest) {
  const url = new URL(req.url);
  // Prefer clientId from Ably SDK authParams; fall back to a random id
  const clientId =
    url.searchParams.get('clientId') ||
    `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.error('Missing ABLY_API_KEY');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // REST client is enough for token requests (no long-lived connection)
    const ably = new Ably.Rest(apiKey);

    // Capabilities must cover every channel + operation the client uses:
    // - conversation:*  subscribe/publish/presence/history (chat + typing + online)
    // - presence:global presence/subscribe (global online status)
    // Missing "history" caused 40160 on channel.history() when switching chats.
    const tokenParams: Ably.TokenParams = {
      clientId,
      capability: {
        'conversation:*': ['subscribe', 'publish', 'presence', 'history'],
        'presence:global': ['subscribe', 'presence'],
      },
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    };

    const tokenRequest = await ably.auth.createTokenRequest(tokenParams);
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('Ably auth error:', error);
    return NextResponse.json({ error: 'Token creation failed' }, { status: 500 });
  }
}
