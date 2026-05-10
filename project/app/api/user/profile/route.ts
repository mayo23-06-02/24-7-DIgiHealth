import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-user-id') || null;
}

// GET /api/user/profile
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile || '',
        saId: user.saId || '',
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        avatarUrl: (user as any).avatarUrl || null,
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/user/profile]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/user/profile – updates name, mobile, avatarUrl
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { firstName, lastName, mobile, avatarUrl, mfaEnabled } = body;

    const update: Record<string, any> = {};
    if (firstName) update.firstName = firstName.trim();
    if (lastName) update.lastName = lastName.trim();
    if (mobile !== undefined) update.mobile = mobile.trim();
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (mfaEnabled !== undefined) update.mfaEnabled = Boolean(mfaEnabled);

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile || '',
        avatarUrl: (user as any).avatarUrl || null,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (err: any) {
    console.error('[PUT /api/user/profile]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
