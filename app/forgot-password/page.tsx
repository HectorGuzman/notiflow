'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.forgotPassword(email);
      const receivedToken = res.data?.token;
      setMessage(
        receivedToken
          ? `Token generado. (Demo) Cópielo para resetear: ${receivedToken}`
          : 'Revisa tu correo para continuar con el reseteo.'
      );
      if (receivedToken) {
        setToken(receivedToken);
        setStep('reset');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo generar el enlace de recuperación';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await apiClient.resetPassword(token, newPassword);
      setMessage('Contraseña actualizada. Ahora puedes iniciar sesión.');
      setStep('request');
      setToken('');
      setNewPassword('');
      setEmail('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo resetear la contraseña';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Recuperar acceso</p>
            <h1 className="text-3xl font-bold text-gray-900">Recuperar contraseña</h1>
          </div>
          <Link href="/login" className="text-primary hover:text-green-800 text-sm">
            ← Volver al login
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700">
            {message}
          </div>
        )}

        {step === 'request' ? (
          <form className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4" onSubmit={handleRequest}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                placeholder="tu@escuela.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        ) : (
          <form className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4" onSubmit={handleReset}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Pega el token recibido. En demo se muestra arriba.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
