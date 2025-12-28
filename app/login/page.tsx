'use client';

import React, { useState } from 'react';
import { Button, Input, Card } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { FiMail, FiLock } from 'react-icons/fi';
import { apiClient } from '@/lib/api-client';
import Image from 'next/image';
import logo from '@/logos/Naranjo_Degradado.png';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.login(email, password);
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      setUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        status === 401 || status === 403
          ? 'Correo o contraseña inválidos'
          : err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 mt-4 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-40 h-40 rounded-2xl overflow-hidden bg-white/80 shadow-lg">
            <Image src={logo} alt="Notiflow" className="object-contain w-full h-full" priority />
          </div>
          <h1 className="text-3xl font-bold text-white mt-3">Notiflow</h1>
          <p className="text-white text-sm mt-1">Comunicaciones inteligentes con IA para tu colegio</p>
        </div>

        {/* Login Form */}
        <Card className="p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu@escuela.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-primary"
                  aria-label="Mostrar contraseña"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 pt-4">
            <button
              type="button"
              className="text-sm text-primary hover:text-primary-dark transition-colors w-full text-center"
              onClick={() => router.push('/forgot-password')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-white text-sm">
          <p>
            © 2025 Notiflow. Todos los derechos reservados. Un producto de{' '}
            <a
              href="https://www.nodospa.cl"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              Nodo SpA
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
