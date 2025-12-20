'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store';

export default function StudentsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManageStudents =
    hasPermission('students.create') ||
    hasPermission('students.update') ||
    hasPermission('students.delete');
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!canManageStudents) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.getUsers();
        const data = (res.data || []).filter((u: any) => (u.role || '').toLowerCase() === 'student');
        setStudents(data);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'No se pudieron cargar los estudiantes';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canManageStudents]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.schoolName?.toLowerCase().includes(q)
    );
  }, [query, students]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  if (!canManageStudents) {
    return (
      <ProtectedLayout>
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin permisos</h1>
          <p className="text-gray-600">
            No tienes permisos para gestionar estudiantes y apoderados.
          </p>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Gestión escolar</p>
            <h1 className="text-4xl font-bold text-gray-900">Estudiantes</h1>
            <p className="text-gray-600 mt-1">Datos reales (se mostrará vacío si aún no hay estudiantes)</p>
          </div>
          <Link href="/dashboard" className="text-primary hover:text-green-800 transition-colors">
            ← Volver al dashboard
          </Link>
        </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Listado</h2>
                <p className="text-sm text-gray-600">Mostrando {paginated.length} de {filtered.length} estudiantes</p>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, curso o nivel..."
                className="w-full sm:w-80 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
              />
            </div>

          {loading && <p className="text-sm text-gray-500">Cargando estudiantes...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Colegio</th>
                  <th className="px-4 py-3">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {paginated.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{s.role || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{s.schoolName || s.schoolId || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div className="flex flex-col">
                        <span>{s.email || 'Sin correo'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td className="px-4 py-3 text-gray-500" colSpan={4}>
                      No se encontraron estudiantes con ese criterio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      </div>
    </ProtectedLayout>
  );
}
