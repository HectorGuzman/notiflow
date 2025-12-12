'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4 bg-white/80 rounded-lg p-6 shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mx-auto">
          <span className="text-3xl font-bold text-primary">N</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notiflow</h1>
          <p className="text-sm text-gray-600">Redirigiendo al login...</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Ir al login
        </Link>
      </div>
    </div>
  );
}
