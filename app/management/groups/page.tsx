'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store';

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName?: string;
};

type GroupItem = {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  schoolId: string;
};

type SchoolItem = {
  id: string;
  name: string;
};

export default function GroupsPage() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  // Acceso sólo si puede crear/editar/borrar grupos (listar por sí solo no muestra la sección)
  const canManageGroups =
    hasPermission('groups.create') ||
    hasPermission('groups.update') ||
    hasPermission('groups.delete');
  const isGlobalAdmin = (user?.schoolId || '').toLowerCase() === 'global';
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    memberIds: [] as string[],
    schoolId: '',
  });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [error, setError] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [debouncedSearchGroup, setDebouncedSearchGroup] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageGroups) return;
    loadUsers();
    if (isGlobalAdmin) loadSchools();
    if (!isGlobalAdmin && user?.schoolId) {
      setGroupForm((prev) => ({ ...prev, schoolId: user.schoolId }));
    }
  }, [canManageGroups, isGlobalAdmin, user]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearchGroup(searchGroup.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchGroup]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchGroup, isGlobalAdmin ? groupForm.schoolId : user?.schoolId]);

  useEffect(() => {
    if (!canManageGroups) return;
    loadGroups();
  }, [canManageGroups, debouncedSearchGroup, page, isGlobalAdmin, groupForm.schoolId]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const res = await apiClient.getUsers();
      setUsers(res.data || []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudieron cargar usuarios';
      setError(msg);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchUser.trim()) return users;
    const term = searchUser.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.role?.toLowerCase().includes(term)
    );
  }, [searchUser, users]);

  const loadSchools = async () => {
    setLoadingSchools(true);
    setError('');
    try {
      const res = await apiClient.getSchools();
      setSchools(res.data || []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudieron cargar colegios';
      setError(msg);
    } finally {
      setLoadingSchools(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const schoolIdParam = isGlobalAdmin ? groupForm.schoolId || undefined : undefined;
      const res = await apiClient.getGroups(
        schoolIdParam,
        undefined,
        debouncedSearchGroup || undefined,
        page,
        pageSize
      );
      const data = res.data || {};
      const items = data.items ?? data ?? [];
      setGroups(items);
      setTotal(data.total ?? items.length ?? 0);
      setHasMore(data.hasMore ?? false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudieron cargar grupos';
      setError(msg);
    } finally {
      setLoadingGroups(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginatedGroups = groups;

  if (!canManageGroups) {
    return (
      <ProtectedLayout>
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin permisos</h1>
          <p className="text-gray-600">No tienes permisos para gestionar grupos.</p>
        </div>
      </ProtectedLayout>
    );
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGroup(true);
    setError('');
    try {
      const schoolId = isGlobalAdmin
        ? groupForm.schoolId || user?.schoolId
        : user?.schoolId || groupForm.schoolId;
      if (!schoolId) {
        setError('Selecciona colegio para el grupo');
        return;
      }
      if (!groupForm.memberIds.length) {
        setError('Selecciona al menos un miembro');
        return;
      }
      if (editingId) {
        await apiClient.updateGroup(editingId, {
          name: groupForm.name,
          description: groupForm.description,
          memberIds: groupForm.memberIds,
          schoolId,
        });
      } else {
        await apiClient.createGroup({
          name: groupForm.name,
          description: groupForm.description,
          memberIds: groupForm.memberIds,
          schoolId,
        });
      }
      setGroupForm({
        name: '',
        description: '',
        memberIds: [],
        schoolId: isGlobalAdmin ? '' : schoolId,
      });
      setEditingId(null);
      await loadGroups();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo guardar el grupo';
      setError(msg);
    } finally {
      setSavingGroup(false);
    }
  };

  const startEdit = (g: GroupItem) => {
    setEditingId(g.id);
    setGroupForm({
      name: g.name,
      description: g.description || '',
      memberIds: g.memberIds || [],
      schoolId: isGlobalAdmin ? g.schoolId : groupForm.schoolId || user?.schoolId || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setGroupForm({
      name: '',
      description: '',
      memberIds: [],
      schoolId: isGlobalAdmin ? '' : user?.schoolId || '',
    });
  };

  const handleDelete = async (id: string) => {
    setSavingGroup(true);
    setError('');
    try {
      await apiClient.deleteGroup(id);
      if (editingId === id) cancelEdit();
      await loadGroups();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo eliminar el grupo';
      setError(msg);
    } finally {
      setSavingGroup(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Gestión</p>
            <h1 className="text-4xl font-bold text-gray-900">Grupos</h1>
            <p className="text-gray-600 mt-1">Crea grupos de usuarios para enviar mensajes</p>
          </div>
          <Link href="/dashboard" className="text-primary hover:text-green-800 transition-colors">
            ← Volver
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Nuevo grupo</h2>
              <p className="text-sm text-gray-600">Define nombre, miembros y colegio</p>
            </div>
            {(loadingGroups || loadingUsers) && (
              <span className="text-sm text-gray-500">Cargando...</span>
            )}
          </div>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateGroup}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={groupForm.description}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                placeholder="Opcional"
              />
            </div>
            {isGlobalAdmin && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Colegio</label>
                <select
                  value={groupForm.schoolId}
                  onChange={(e) => setGroupForm((prev) => ({ ...prev, schoolId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200 bg-white"
                >
                  <option value="">Selecciona colegio</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Miembros</label>
              <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <input
                    type="search"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Buscar por nombre, email o rol"
                    className="w-full sm:w-2/3 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {filteredUsers.length} resultado(s)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:border-primary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupForm.memberIds.includes(u.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setGroupForm((prev) => {
                            const next = new Set(prev.memberIds);
                            if (checked) next.add(u.id);
                            else next.delete(u.id);
                            return { ...prev, memberIds: Array.from(next) };
                          });
                        }}
                      />
                      <div>
                        <p className="text-gray-800 font-medium">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                        <p className="text-gray-400 text-xs">{u.role}</p>
                      </div>
                    </label>
                  ))}
                  {!users.length && (
                    <p className="text-sm text-gray-500">No hay usuarios para seleccionar.</p>
                  )}
                  {users.length > 0 && !filteredUsers.length && (
                    <p className="text-sm text-gray-500">Sin coincidencias para la búsqueda.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={savingGroup}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {savingGroup ? 'Guardando...' : editingId ? 'Actualizar grupo' : 'Crear grupo'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="ml-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  disabled={savingGroup}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Grupos creados</h2>
            <div className="flex items-center gap-3">
              <input
                type="search"
                value={searchGroup}
                onChange={(e) => {
                  setSearchGroup(e.target.value);
                }}
                placeholder="Buscar grupo"
                className="w-48 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
              />
              <span className="text-xs text-gray-500">
                Mostrando {paginatedGroups.length} de {total} grupo(s)
              </span>
              <button
                type="button"
                onClick={loadGroups}
                className="text-sm text-primary hover:text-green-800"
              >
                Refrescar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paginatedGroups.map((g) => (
              <div
                key={g.id}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                {g.description && <p className="text-xs text-gray-600 mb-1">{g.description}</p>}
                <p className="text-xs text-gray-600">
                  Miembros: {g.memberIds?.length || 0} • Colegio: {g.schoolId}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => startEdit(g)}
                    className="text-xs text-primary hover:underline"
                  >
                    Editar
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(g.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            {!paginatedGroups.length && (
              <div className="text-sm text-gray-500">No hay grupos registrados.</div>
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
      </div>
    </ProtectedLayout>
  );
}
