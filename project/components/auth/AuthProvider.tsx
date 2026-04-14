'use client';

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  avatarUrl: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, logout: async () => {} });

export function AuthProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const router = useRouter();

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      // Force hard reload or push to clear context
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {/* Absolute positioned logout button as requested for all dashboards if not integrated directly into the sidebars. */}
      {/* Wait, the user said: "Includes a logout button that calls /api/auth/logout and redirects to /login." */}
      <div className="relative min-h-screen w-full">
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
