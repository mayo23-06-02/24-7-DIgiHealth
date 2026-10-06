import { escapeHtml, renderEmail } from "@/lib/email/layout";
import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/resend';
import { getAppOrigin } from '@/lib/supabase/auth';
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

    // Construct the reset link from wherever this request actually came
    // from — the same helper login/invite emails already use — rather than
    // a hardcoded env var. That's what let this link keep pointing at a
    // domain that's since been disabled: NEXT_PUBLIC_APP_URL doesn't
    // update itself just because a different domain is now live, but the
    // real incoming request origin always reflects reality.
    const appUrl = getAppOrigin(req.url);
    const resetLink = `${appUrl}/forgot-password?token=${encodeURIComponent(resetToken)}`;

    // Send the reset email
    const emailResult = await sendEmail({
      to: user.email,
      subject: '24/7 Digi-Health — Reset your password',
      html: renderEmail({
        preheader: "Use the link inside to choose a new password. It expires in 10 minutes.",
        eyebrow: "Account security",
        title: "Reset your password",
        icon: "&#128273;",
        greeting: `Dear ${escapeHtml(user.firstName)},`,
        paragraphs: [
          "We received a request to reset the password for your 24/7 Digi-Health account. Please use the button below to choose a new password.",
        ],
        cta: { label: "Reset password", url: resetLink },
        notes: [
          "This link expires in <strong>10 minutes</strong>.",
          "If you did not request a password reset, you can safely ignore this email. Your password will not change.",
        ],
      }),
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
