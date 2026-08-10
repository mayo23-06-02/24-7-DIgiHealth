import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 86400,
};

/** POST — restores the guardian's own session after impersonating a child
 * (see ../[memberId]/switch/route.ts). No auth check on the *current*
 * identity needed: only a session that switch/route.ts itself set the
 * guardian_token cookie for can possibly have it. */
export async function POST(req: NextRequest) {
  const guardianToken = req.cookies.get('guardian_token')?.value;
  if (!guardianToken) {
    return NextResponse.json(
      { success: false, error: 'Not currently managing a family member.' },
      { status: 400 },
    );
  }

  try {
    await jwtVerify(guardianToken, SECRET);
  } catch {
    const response = NextResponse.json(
      { success: false, error: 'Your original session expired — please log in again.' },
      { status: 401 },
    );
    response.cookies.delete('token');
    response.cookies.delete('guardian_token');
    return response;
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('token', guardianToken, COOKIE_OPTS);
  response.cookies.delete('guardian_token');
  return response;
}
