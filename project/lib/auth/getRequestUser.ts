import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "secret123!");

export interface RequestUser {
  userId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export async function getRequestUser(): Promise<RequestUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    await connectToDatabase();
    const user = await User.findById(payload.userId).lean();

    if (!user) {
      return null;
    }

    return {
      userId: user._id.toString(),
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
