'use client';

import Link from 'next/link';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, useYearStore } from '@/store';

type MessageItem = { id: string; content: string; senderName: string; createdAt?: string; status?: string; recipients?: string[] };
type UserItem = { id: string; role: string };

export default function DashboardPage() {
  const { year } = useYearStore();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreateMessage = hasPermission('messages.create');
  const canSeeMessages = hasPermission('messages.list');
  const canSeeReports = hasPermission('reports.view');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [msgRes, usrRes] = await Promise.all([
          apiClient.getMessages({ year }),
          apiClient.getUsers(),
        ]);
        setMessages(msgRes.data || []);
        setUsers(usrRes.data || []);
      } catch {
        // silencioso; mostramos conteos en cero
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year]);

  const stats = useMemo(
    () => [
      { label: 'Mensajes del año', value: messages.length },
      { label: 'Usuarios', value: users.length },
      { label: 'Admins', value: users.filter((u) => (u.role || '').toLowerCase() === 'admin').length },
    ],
    [messages.length, users]
  );

  const quickActions = [
    canCreateMessage
      ? {
          title: 'Enviar Nuevo Mensaje',
          description: 'Crea y envía un mensaje a estudiantes, cursos o niveles',
          href: '/messages/new',
          color: 'bg-primary',
        }
      : null,
    canSeeMessages
      ? {
          title: 'Mis Mensajes',
          description: 'Revisa el historial de mensajes enviados',
          href: '/messages',
          color: 'bg-blue-600',
        }
      : null,
    canSeeReports
      ? {
          title: 'Reportes de Mensajes',
          description: 'Revisa métricas de envíos',
          href: '/reports',
          color: 'bg-purple-600',
        }
      : null,
  ].filter(Boolean) as { title: string; description: string; href: string; color: string }[];

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">Panel general</p>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Gestiona tu comunicación escolar de forma centralizada
            </p>
          </div>
          {canCreateMessage && (
            <Link
              href="/messages/new"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-white font-medium hover:bg-green-700 transition-colors"
            >
              + Enviar mensaje
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Acciones Rápidas</h2>
            <Link
              href="/messages"
              className="text-primary hover:text-green-800 transition-colors text-sm"
            >
              Ver historial
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                href={action.href}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${action.color} p-3 rounded-lg`}>
                    <div className="w-6 h-6 text-white">→</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-primary transition-colors">→</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {action.title}
                </h3>
                <p className="text-gray-600 text-sm">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Mensajes Recientes</h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            {loading && <p className="text-sm text-gray-500">Cargando mensajes...</p>}
            {!loading && messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay mensajes aún. ¡Envía tu primer mensaje!</p>
                {canCreateMessage && (
                  <div className="mt-4">
                    <Link
                      href="/messages/new"
                      className="inline-block px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Redactar mensaje
                    </Link>
                  </div>
                )}
              </div>
            )}
            {!loading && messages.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {messages.slice(0, 5).map((m) => (
                  <li key={m.id} className="py-3">
                    <p className="text-sm text-gray-900 line-clamp-2">{m.content}</p>
                    <p className="text-xs text-gray-500">
                      {m.senderName || '—'} · {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
