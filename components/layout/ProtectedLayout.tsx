'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from './Layout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store';

interface Props {
  children: React.ReactNode;
}

export const ProtectedLayout = ({ children }: Props) => {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      setChecking(false);
      router.replace('/login');
      return;
    }

    if (user) {
      setChecking(false);
      return;
    }

    apiClient
      .getAuthMe()
      .then((res) => {
        if (res?.data) {
          setUser(res.data);
        }
      })
      .catch(() => {
        localStorage.removeItem('authToken');
        setUser(null);
        router.replace('/login');
      })
      .finally(() => setChecking(false));
  }, [router, setUser, user]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-secondary/5 text-secondary">
        <div className="glass-panel px-6 py-4 rounded-2xl text-sm font-semibold shadow-lg">
          Validando sesión...
        </div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
};
