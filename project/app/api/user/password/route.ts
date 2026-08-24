import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

import { apiError } from "@/lib/api/errors";
async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-user-id') || null;
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // OTP-only accounts never had a usable password
    if (!user.passwordHash || user.passwordHash.startsWith('otp_only:')) {
      return NextResponse.json(
        {
          error:
            'This account signs in with email OTP only. Password change is not available.',
          code: 'AUTH_OTP_ONLY',
        },
        { status: 400 },
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 401 });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('[PUT /api/user/password]', err);
    return apiError(err);
  }
}
