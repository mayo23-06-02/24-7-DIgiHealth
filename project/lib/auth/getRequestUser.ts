import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import User from "@/lib/models/User";
import { isValidId } from "@/lib/db";

/** Fails closed: an unset JWT_SECRET yields an empty key, which jose rejects. */
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface RequestUser {
  userId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Resolve the signed-in account from the session cookie.
 *
 * The JWT's `userId` claim is the Postgres `users.id` (uuid). A token carrying
 * anything else is treated as signed out.
 */
export async function getRequestUser(): Promise<RequestUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const identityId = payload.userId as string;
    if (!isValidId(identityId)) return null;

    const user = await User.findById(identityId)
      .select("role email firstName lastName")
      .lean();
    if (!user) return null;

    return {
      userId: String(user._id),
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  } catch (error) {
    console.error("getRequestUser auth error:", error);
    return null;
  }
}
