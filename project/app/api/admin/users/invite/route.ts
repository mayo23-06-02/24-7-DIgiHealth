import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import PlatformInvite from "@/lib/models/PlatformInvite";
import { requirePlatformAdmin, canAssignRole } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { syncUser } from "@/lib/postgres/users";
import { getAppOrigin, normalizeEmail, isValidEmail } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email/resend";
import { platformInviteEmailHtml } from "@/lib/email/templates/platformInvite";
import { adminAccountCreatedEmailHtml } from "@/lib/email/templates/adminAccountCreated";

import { apiError } from "@/lib/api/errors";

const INVITE_TTL_DAYS = 7;

/** Roles that complete their own profile through the registration wizard. */
const WIZARD_ROLES = ["patient", "practitioner", "hospital_admin"] as const;
/** Roles created in full immediately — there's no wizard for them. */
const DIRECT_CREATE_ROLES = ["super_admin", "mega_admin"] as const;

const WIZARD_ROUTE: Record<string, string> = {
  patient: "patient",
  practitioner: "practitioner",
  hospital_admin: "hospital",
};

function generatePassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * POST /api/admin/users/invite
 * Invites a new user by email, from User Management. Patient/practitioner/
 * hospital_admin get an email with a link to complete their own profile via
 * the normal registration wizard, same as any self-registered account.
 * super_admin/mega_admin have no wizard to complete, so the account is
 * created in full immediately and the person is emailed a login link with a
 * generated password instead.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const actor = gate.user;

    await connectToDatabase();
    const body = await req.json();
    const email = normalizeEmail(body.email || "");
    const role = String(body.role || "");
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }
    if (!canAssignRole(actor.role, role)) {
      return NextResponse.json(
        { error: "You cannot invite this role" },
        { status: 403 },
      );
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const invitedByName = [actor.firstName, actor.lastName]
      .filter(Boolean)
      .join(" ");
    const origin = getAppOrigin(req.url);

    // ── super_admin / mega_admin: create the full account now ──
    if ((DIRECT_CREATE_ROLES as readonly string[]).includes(role)) {
      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));

      const newUser = await User.create({
        email,
        passwordHash,
        role,
        firstName: firstName || (role === "mega_admin" ? "Mega" : "Super"),
        lastName: lastName || "Admin",
        status: "active",
        emailVerified: true,
        mfaEnabled: false,
      } as any);
      await syncUser(newUser as any);

      const { error } = await sendEmail({
        to: email,
        subject: `Your 24/7 DigiHealth ${role === "mega_admin" ? "Mega Admin" : "Super Admin"} account`,
        html: adminAccountCreatedEmailHtml({
          role,
          email,
          password,
          loginUrl: `${origin}/login`,
          invitedByName,
        }),
      });
      if (error) {
        console.warn("[POST /api/admin/users/invite] Email provider warning:", error);
      }

      await logAdminAction({
        actor,
        action: "user.invite.direct_create",
        targetType: "user",
        targetId: newUser._id.toString(),
        metadata: { email, role },
      });

      return NextResponse.json({
        success: true,
        data: { email, role, created: true },
      });
    }

    // ── patient / practitioner / hospital_admin: send a registration link ──
    if (!(WIZARD_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: "This role cannot be invited yet" },
        { status: 400 },
      );
    }

    // Superseding a prior pending invite avoids two live links for the same person.
    await PlatformInvite.updateMany(
      { email, status: "pending" },
      { status: "cancelled" },
    );

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const invite = await PlatformInvite.create({
      email,
      // Narrowed by the WIZARD_ROLES.includes(role) check above, but that
      // guard is on a readonly-string[]-cast array, so TS can't narrow
      // `role: string` to the model's literal union from it automatically.
      role: role as "patient" | "practitioner" | "hospital_admin",
      invitedBy: actor.userId,
      token,
      status: "pending",
      expiresAt,
    });

    const inviteUrl = `${origin}/register/${WIZARD_ROUTE[role]}?adminInvite=${token}`;
    const { error } = await sendEmail({
      to: email,
      subject: "You're invited to join 24/7 DigiHealth",
      html: platformInviteEmailHtml({ role, inviteUrl, invitedByName }),
    });
    if (error) {
      console.warn("[POST /api/admin/users/invite] Email provider warning:", error);
    }

    await logAdminAction({
      actor,
      action: "user.invite.sent",
      targetType: "platform_invite",
      targetId: invite._id.toString(),
      metadata: { email, role },
    });

    return NextResponse.json({
      success: true,
      data: { email, role, created: false, inviteUrl },
    });
  } catch (err: any) {
    console.error("[POST /api/admin/users/invite]", err);
    return apiError(err);
  }
}
