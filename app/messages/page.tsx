'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, useYearStore } from '@/store';

type MessageItem = {
  id: string;
  content: string;
  senderName: string;
  senderEmail?: string;
  recipients: string[];
  channels?: string[];
  emailStatus?: string;
  appStatus?: string;
  status: string;
  createdAt: string;
  attachments?: { fileName: string; mimeType?: string; downloadUrl?: string; inline?: boolean }[];
};

const statusLabel = (status?: string) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'sent':
    case 'delivered':
      return 'Enviado';
    case 'failed':
      return 'Falló';
    case 'pending':
      return 'Pendiente';
    case 'read':
      return 'Leído';
    case 'scheduled':
      return 'Programado';
    case 'draft':
      return 'Borrador';
    default:
      return status || '—';
  }
};

const statusIcon = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'sent' || s === 'delivered') {
    return '✔';
  }
  if (s === 'read') {
    return '✔✔';
  }
  return '';
};

export default function MessagesPage() {
  const { year } = useYearStore();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canList = hasPermission('messages.list');
  const canCreate = hasPermission('messages.create');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!canList) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.getMessages({ year });
        setMessages(res.data || []);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'No se pudieron cargar los mensajes';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canList, year]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (messages || []).filter(
      (m) =>
        !term ||
        m.content?.toLowerCase().includes(term) ||
        m.senderName?.toLowerCase().includes(term) ||
        m.senderEmail?.toLowerCase().includes(term) ||
        (Array.isArray(m.recipients) && m.recipients.join(',').toLowerCase().includes(term))
    );
  }, [messages, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize).map((m) => ({
      ...m,
      recipientsText: Array.isArray(m.recipients) ? m.recipients.join(', ') : '',
      channelsText: Array.isArray(m.channels) ? m.channels.join(', ') : '',
      createdText: m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
    }));
  }, [filtered, page, pageSize]);

  if (!canList) {
    return (
      <ProtectedLayout>
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin permisos</h1>
          <p className="text-gray-600">
            No tienes permisos para ver el historial de mensajes.
          </p>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Historial</p>
            <h1 className="text-4xl font-bold text-gray-900">Mis Mensajes</h1>
            <p className="text-gray-600 mt-1">
              Historial de mensajes enviados y programados (año {year})
            </p>
          </div>
          {canCreate && (
            <Link
              href="/messages/new"
              className="inline-flex px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              + Nuevo Mensaje
            </Link>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por contenido, remitente o destinatario"
            className="w-full sm:w-96 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
          />
          <div className="text-sm text-gray-600">
            Mostrando {paginated.length} de {filtered.length} mensajes
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {loading && (
            <p className="p-4 text-sm text-gray-600">Cargando mensajes...</p>
          )}
          {error && (
            <p className="p-4 text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Mensaje</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Enviado por</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Destinatarios</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Estado canales</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginated.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <p className="line-clamp-2">{message.content}</p>
                      {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold text-gray-700">Adjuntos:</p>
                          {message.attachments.map((att) => (
                            <div key={att.fileName} className="text-xs text-primary flex items-center gap-1">
                              <span>📎</span>
                              {att.downloadUrl ? (
                                <a
                                  className="hover:underline break-all"
                                  href={att.downloadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {att.fileName}
                                </a>
                              ) : (
                                <span className="break-all">{att.fileName}</span>
                              )}
                              {att.mimeType && <span className="text-gray-400">({att.mimeType})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-medium">{message.senderName || '—'}</span>
                        <span className="text-xs text-gray-500">{message.senderEmail || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {message.recipientsText || '—'}
                    </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="space-y-1">
                      {Array.isArray(message.channels) && message.channels.includes('email') && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Email</span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              (message.emailStatus || message.status || '').toLowerCase() === 'sent'
                                ? 'bg-green-100 text-green-700'
                                : (message.emailStatus || message.status || '').toLowerCase() === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : (message.emailStatus || message.status || '').toLowerCase() === 'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span className="mr-1">{statusIcon(message.emailStatus || message.status)}</span>
                            {statusLabel(message.emailStatus || message.status)}
                          </span>
                        </div>
                      )}
                      {Array.isArray(message.channels) && message.channels.includes('app') && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">App</span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              (message.appStatus || 'pending').toLowerCase() === 'read'
                                ? 'bg-blue-100 text-blue-700'
                                : (message.appStatus || 'pending').toLowerCase() === 'sent'
                                  ? 'bg-green-100 text-green-700'
                                  : (message.appStatus || 'pending').toLowerCase() === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                  : (message.appStatus || 'pending').toLowerCase() === 'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span className="mr-1">{statusIcon(message.appStatus || 'pending')}</span>
                            {statusLabel(message.appStatus || 'pending')}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Canales: {message.channelsText || '—'}</p>
                    </div>
                  </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {message.createdText || '—'}
                    </td>
                  </tr>
                ))}
                {!filtered.length && !loading && (
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={4}>
                      No hay mensajes todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
