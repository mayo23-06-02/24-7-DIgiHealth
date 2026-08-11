import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/resend';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * POST /api/auth/forgot-password
 *
 * Initiates a password reset flow. Accepts an email/SA-ID, generates a
 * single-use token, stores its hash + expiry (10 min) on the user, and
 * emails the reset link. Always returns 200 regardless of whether the
 * account exists, to prevent account-enumeration attacks.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier } = body;

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      // Return 200 even for missing/empty identifier to avoid enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    await connectToDatabase();
    const trimmed = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: trimmed },
        { saId: trimmed },
      ],
    });

    if (!user) {
      // Non-existent accounts get the same success response to prevent enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    if (user.status === 'suspended') {
      // Still return 200 to avoid leaking suspension status
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    // Generate a cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the hashed token + expiry on the user
    user.resetTokenHash = resetTokenHash;
    user.resetTokenExpiresAt = resetTokenExpiresAt;
    await user.save();

    // Construct the reset link
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/forgot-password?token=${encodeURIComponent(resetToken)}`;

    // Send the reset email
    const emailResult = await sendEmail({
      to: user.email,
      subject: '24/7 DigiHealth — Reset your password',
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; color: #333;">
  <p>Hi ${user.firstName},</p>
  <p>We received a request to reset your password. Click the link below to set a new one:</p>
  <p>
    <a href="${resetLink}" style="background-color: #4493b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Reset Password
    </a>
  </p>
  <p>This link expires in 10 minutes.</p>
  <p>If you didn't request this, you can safely ignore this email.</p>
  <p>24/7 DigiHealth</p>
</body>
</html>
      `,
    });

    if (emailResult.error) {
      console.error('Failed to send reset email:', emailResult.error);
      // Clear the token on send failure so the user can try again
      user.resetTokenHash = undefined;
      user.resetTokenExpiresAt = undefined;
      await user.save();
    }

    // Always return 200 to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error: unknown) {
    console.error('[POST /api/auth/forgot-password]', error);
    // Return 200 even on error to avoid revealing server state
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  }
}
