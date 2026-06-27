"use client";

import { useAuthContext } from "@/components/auth/AuthProvider";

export function useAuth() {
  const { user, logout } = useAuthContext();

  return {
    user,
    logout,
    role: user?.role,
    isAuthenticated: !!user,
  };
}
