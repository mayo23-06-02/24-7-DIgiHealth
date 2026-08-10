import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { connectToDatabase } from '@/lib/mongodb';
import { getRequestUser } from '@/lib/auth/getRequestUser';
import User from '@/lib/models/User';
import { canViewMedicalHistory } from '@/lib/family/access';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 86400,
};

/**
 * POST — guardian "logs in" as a linked child with no password, since the
 * guardian is already authenticated and the child has none (see
 * app/api/patient/family/child/route.ts). Gated by canViewMedicalHistory,
 * which is only true for isMinor links — this can never be used against an
 * adult dependent's account, so it can't be used to bypass their medical
 * privacy. The guardian's own token is preserved in a second cookie so
 * switch-back (see ../switch-back/route.ts) needs no re-login either.
 *
 * A session that's already impersonating a child can't nest a second
 * impersonation: getRequestUser() would resolve to the child's identity,
 * and a child is never a guardian of anyone, so canViewMedicalHistory below
 * fails closed — no extra guard needed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    await connectToDatabase();
    const guardian = await getRequestUser();
    if (!guardian) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await params;
    if (!(await canViewMedicalHistory(guardian.userId, memberId))) {
      return NextResponse.json(
        { success: false, error: 'This family member cannot be switched into.' },
        { status: 403 },
      );
    }

    const child = await User.findById(memberId).lean();
    if (!child) {
      return NextResponse.json({ success: false, error: 'Family member not found' }, { status: 404 });
    }

    const guardianToken = req.cookies.get('token')?.value;
    if (!guardianToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const childToken = await new SignJWT({
      userId: (child as any)._id.toString(),
      role: (child as any).role,
      email: (child as any).email,
      firstName: (child as any).firstName,
      lastName: (child as any).lastName,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(SECRET);

    const response = NextResponse.json({ success: true });
    response.cookies.set('guardian_token', guardianToken, COOKIE_OPTS);
    response.cookies.set('token', childToken, COOKIE_OPTS);
    return response;
  } catch (err: any) {
    console.error('[POST /api/patient/family/[memberId]/switch]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
