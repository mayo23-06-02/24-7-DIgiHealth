'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name?: string;
  role: string;
  avatarUrl?: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch to get user info if they are logged in.
    fetchUser();
    
    // Setup interceptors for automatic refresh when using fetch natively is tricky, 
    // but we can poll or refresh periodically since we can't globally intercept `fetch` without replacing window.fetch.
    // For MVP, we routinely try to refresh token every 10 minutes.
    const interval = setInterval(async () => {
      try {
        await fetch('/api/auth/refresh', { method: 'POST' });
      } catch (err) {
        console.error('Refresh token failed', err);
      }
    }, 10 * 60 * 1000); 

    return () => clearInterval(interval);
  }, []);

  const fetchUser = async () => {
    try {
      // In a real app we might have a /api/auth/me endpoint.
      // Since it wasn't requested we'll assume we can decode it from a cookie or just use a mock for now, 
      // but wait, layout.tsx handles this via server components.
      // On client side:
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  // We can wrap standard fetch to automatically catch 401s
  const authenticatedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    if (response.status === 401) {
      router.push('/login');
    }
    return response;
  };

  return { user, loading, logout, fetch: authenticatedFetch };
}
