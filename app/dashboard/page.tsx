'use client';

import Link from 'next/link';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, useYearStore } from '@/store';

type MessageItem = { id: string; content: string; senderName: string; createdAt?: string; status?: string; recipients?: string[]; schoolId?: string };
type UserItem = { id: string; role: string; schoolId?: string; schoolName?: string };
type SchoolItem = { id: string; name: string };

export default function DashboardPage() {
  const { year } = useYearStore();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const currentUser = useAuthStore((state) => state.user);
  const canCreateMessage = hasPermission('messages.create');
  const canSeeMessages = hasPermission('messages.list');
  const canSeeReports = hasPermission('reports.view');
  const canSeeUsers = hasPermission('users.list');
  const isSuperAdmin = (currentUser?.role || '').toLowerCase() === 'superadmin' || hasPermission('*');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [appActiveBySchool, setAppActiveBySchool] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const msgPromise = apiClient.getMessages({ year });
        const usrPromise = canSeeUsers ? apiClient.getUsers() : Promise.resolve({ data: [] });
        const schPromise = isSuperAdmin ? apiClient.getSchools() : Promise.resolve({ data: [] });
        const usagePromise = isSuperAdmin ? apiClient.getUsageMetrics() : Promise.resolve({ data: {} });
        const [msgRes, usrRes, schRes, usageRes] = await Promise.all([msgPromise, usrPromise, schPromise, usagePromise]);
        setMessages(msgRes.data || []);
        setUsers(usrRes.data || []);
        setSchools((schRes.data || []).map((s: any) => ({ id: s.id, name: s.name })));
        const appMap = (usageRes.data?.appActiveBySchool as Record<string, number> | undefined) || {};
        setAppActiveBySchool(appMap);
      } catch {
        // silencioso; mostramos conteos en cero
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, canSeeUsers, isSuperAdmin]);

  const stats = useMemo(
    () => {
      const base = [{ label: 'Mensajes del año', value: messages.length }];
      if (canSeeUsers) {
        base.push({ label: 'Usuarios', value: users.length });
        base.push({
          label: 'Admins',
          value: users.filter((u) => (u.role || '').toLowerCase() === 'admin').length,
        });
      }
      return base;
    },
    [messages.length, users, canSeeUsers]
  );

  const schoolBreakdown = useMemo(() => {
    if (!isSuperAdmin) return [];
    const userCount = new Map<string, number>();
    const adminCount = new Map<string, number>();
    const messageCount = new Map<string, number>();
    const appActiveCount = new Map<string, number>();

    users.forEach((u) => {
      const id = u.schoolId || 'desconocido';
      userCount.set(id, (userCount.get(id) || 0) + 1);
      if ((u.role || '').toLowerCase() === 'admin') {
        adminCount.set(id, (adminCount.get(id) || 0) + 1);
      }
    });
    messages.forEach((m) => {
      const id = m.schoolId || 'desconocido';
      messageCount.set(id, (messageCount.get(id) || 0) + 1);
    });
    Object.entries(appActiveBySchool || {}).forEach(([id, count]) => {
      appActiveCount.set(id, (appActiveCount.get(id) || 0) + Number(count));
    });

    const knownSchools = new Map<string, string>();
    schools.forEach((s) => knownSchools.set(s.id, s.name));
    // Add any school seen only in data
    userCount.forEach((_, id) => {
      if (!knownSchools.has(id)) knownSchools.set(id, `Colegio ${id}`);
    });
    messageCount.forEach((_, id) => {
      if (!knownSchools.has(id)) knownSchools.set(id, `Colegio ${id}`);
    });
    appActiveCount.forEach((_, id) => {
      if (!knownSchools.has(id)) knownSchools.set(id, `Colegio ${id}`);
    });

    return Array.from(knownSchools.entries()).map(([id, name]) => ({
      id,
      name,
      users: userCount.get(id) || 0,
      admins: adminCount.get(id) || 0,
      messages: messageCount.get(id) || 0,
      appActive: appActiveCount.get(id) || 0,
    }));
  }, [isSuperAdmin, users, messages, schools, appActiveBySchool]);

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

        <div className={`grid grid-cols-1 gap-6 ${stats.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
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

        {isSuperAdmin && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Visión por colegio</h2>
              <p className="text-sm text-gray-500">Solo visible para Superadmin</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolBreakdown.map((s) => (
                <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">{s.id}</p>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{s.name}</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Usuarios</span>
                      <span className="font-bold">{loading ? '—' : s.users}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admins</span>
                      <span className="font-bold">{loading ? '—' : s.admins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mensajes {year}</span>
                      <span className="font-bold">{loading ? '—' : s.messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Activos en app</span>
                      <span className="font-bold">{loading ? '—' : s.appActive}</span>
                    </div>
                  </div>
                </div>
              ))}
              {schoolBreakdown.length === 0 && (
                <div className="bg-white border border-dashed border-gray-300 rounded-lg p-5 text-sm text-gray-500">
                  No hay datos de colegios aún.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </ProtectedLayout>
  );
}
