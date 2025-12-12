'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store';

type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName?: string;
};

type SchoolItem = {
  id: string;
  name: string;
};

type GroupItem = {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  schoolId: string;
};

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  const isGlobalAdmin = isAdmin && (user?.schoolId || '').toLowerCase() === 'global';

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState('');
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'TEACHER',
    password: '',
    schoolId: '',
    schoolName: '',
  });
  const [schoolForm, setSchoolForm] = useState({
    id: '',
    name: '',
  });
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    memberIds: [] as string[],
    schoolId: '',
  });
  const [csvInfo, setCsvInfo] = useState<{ fileName: string; rows: number }>({
    fileName: '',
    rows: 0,
  });
  const [csvData, setCsvData] = useState<
    { name: string; email: string; role: string; password: string }[]
  >([]);
  const [savingUser, setSavingUser] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);

  const availableRoles = useMemo(
    () => [
      { value: 'ADMIN', label: 'Admin' },
      { value: 'DIRECTOR', label: 'Director' },
      { value: 'COORDINATOR', label: 'Coordinador' },
      { value: 'TEACHER', label: 'Profesor' },
    ],
    []
  );

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadSchools();
    loadGroups();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    // Prefill school for admins de colegio
    if (!isGlobalAdmin && user?.schoolId) {
      setUserForm((prev) => ({
        ...prev,
        schoolId: user.schoolId,
        schoolName: user.schoolName || '',
      }));
    }
  }, [isAdmin, isGlobalAdmin, user]);

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
        'No se pudo cargar usuarios';
      setError(msg);
    } finally {
      setLoadingUsers(false);
    }
  };

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
        'No se pudo cargar escuelas';
      setError(msg);
    } finally {
      setLoadingSchools(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchool(true);
    setError('');
    try {
      if (!schoolForm.id || !schoolForm.name) {
        setError('Completa ID y nombre de la escuela');
        return;
      }
      await apiClient.createSchool({
        id: schoolForm.id.trim(),
        name: schoolForm.name.trim(),
      });
      setSchoolForm({ id: '', name: '' });
      await loadSchools();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo crear la escuela';
      setError(msg);
    } finally {
      setSavingSchool(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const schoolIdParam = isGlobalAdmin ? groupForm.schoolId || undefined : undefined;
      const res = await apiClient.getGroups(schoolIdParam);
      setGroups(res.data || []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo cargar grupos';
      setError(msg);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGroup(true);
    setError('');
    try {
      const schoolId = isGlobalAdmin
        ? groupForm.schoolId || userForm.schoolId
        : user?.schoolId || groupForm.schoolId;
      if (!schoolId) {
        setError('Selecciona colegio para el grupo');
        return;
      }
      if (!groupForm.memberIds.length) {
        setError('Selecciona al menos un miembro');
        return;
      }
      await apiClient.createGroup({
        name: groupForm.name,
        description: groupForm.description,
        memberIds: groupForm.memberIds,
        schoolId,
      });
      setGroupForm({
        name: '',
        description: '',
        memberIds: [],
        schoolId: isGlobalAdmin ? '' : schoolId,
      });
      await loadGroups();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo crear el grupo';
      setError(msg);
    } finally {
      setSavingGroup(false);
    }
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const [headerLine, ...rows] = lines;
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
    const idx = {
      name: headers.indexOf('name'),
      email: headers.indexOf('email'),
      role: headers.indexOf('role'),
      password: headers.indexOf('password'),
    };
    if (idx.name === -1 || idx.email === -1 || idx.role === -1 || idx.password === -1) {
      throw new Error('CSV debe tener columnas: name,email,role,password');
    }
    return rows.map((row) => {
      const cols = row.split(',').map((c) => c.trim());
      return {
        name: cols[idx.name] || '',
        email: cols[idx.email] || '',
        role: cols[idx.role] || 'TEACHER',
        password: cols[idx.password] || '',
      };
    });
  };

  const handleCsvFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = parseCsv(text);
      setCsvData(parsed);
      setCsvInfo({ fileName: file.name, rows: parsed.length });
    } catch (err: any) {
      setError(err.message || 'Error al leer CSV');
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvData.length) {
      setError('Sube un CSV válido antes de importar');
      return;
    }
    setImportingCsv(true);
    setError('');
    try {
      const schoolId = isGlobalAdmin ? schoolForm.id || userForm.schoolId : user?.schoolId;
      const schoolName =
        isGlobalAdmin
          ? schoolForm.name || schools.find((s) => s.id === schoolId)?.name || ''
          : user?.schoolName || '';
      if (!schoolId) {
        setError('Define el colegio (ID) para importar usuarios');
        return;
      }
      // opcional: crear colegio si no existe y admin global proporcionó datos
      if (isGlobalAdmin && schoolForm.id && schoolForm.name) {
        try {
          await apiClient.createSchool({ id: schoolForm.id, name: schoolForm.name });
          await loadSchools();
        } catch (_) {
          // puede fallar si ya existe; ignoramos
        }
      }
      for (const row of csvData) {
        if (!row.email || !row.password || !row.name) continue;
        await apiClient.createUser({
          name: row.name,
          email: row.email,
          role: row.role || 'TEACHER',
          password: row.password,
          schoolId,
          schoolName: schoolName || 'Colegio',
        });
      }
      await loadUsers();
      setCsvData([]);
      setCsvInfo({ fileName: '', rows: 0 });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al importar CSV';
      setError(msg);
    } finally {
      setImportingCsv(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    setError('');
    try {
      const schoolId = isGlobalAdmin ? userForm.schoolId : user?.schoolId || userForm.schoolId;
      const schoolName =
        isGlobalAdmin
          ? userForm.schoolName ||
            schools.find((s) => s.id === userForm.schoolId)?.name ||
            ''
          : user?.schoolName || userForm.schoolName;

      if (!schoolId) {
        setError('Selecciona una escuela');
        return;
      }

      await apiClient.createUser({
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        password: userForm.password,
        schoolId,
        schoolName: schoolName || 'Colegio',
      });
      setUserForm({
        name: '',
        email: '',
        role: 'TEACHER',
        password: '',
        schoolId: isGlobalAdmin ? '' : schoolId,
        schoolName: isGlobalAdmin ? '' : schoolName,
      });
      await loadUsers();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo crear el usuario';
      setError(msg);
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Preferencias</p>
            <h1 className="text-4xl font-bold text-gray-900">Configuración</h1>
            <p className="text-gray-600 mt-1">
              Gestiona la configuración de tu institución
            </p>
          </div>
          <Link href="/dashboard" className="text-primary hover:text-green-800 transition-colors">
            ← Volver al dashboard
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {isAdmin && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Usuarios y Roles</h2>
                  <p className="text-sm text-gray-600">
                    Crea y administra usuarios dentro de tu colegio
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-primary text-white">Admin</span>
              </div>

              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateUser}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200 bg-white"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colegio</label>
                  {isGlobalAdmin ? (
                    <select
                      value={userForm.schoolId}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, schoolId: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200 bg-white"
                    >
                      <option value="">Selecciona colegio</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={user?.schoolName || user?.schoolId || ''}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-600"
                    />
                  )}
                </div>
                {isGlobalAdmin && (
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del colegio
                    </label>
                    <input
                      type="text"
                      value={userForm.schoolName}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, schoolName: e.target.value }))
                      }
                      placeholder="Solo si el colegio no está en la lista"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                    />
                  </div>
                )}
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {savingUser ? 'Guardando...' : 'Crear usuario'}
                  </button>
                </div>
              </form>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Usuarios</h3>
                  {loadingUsers && <span className="text-sm text-gray-500">Cargando...</span>}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-600">
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Rol</th>
                        <th className="px-3 py-2">Colegio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{u.name}</td>
                          <td className="px-3 py-2 text-gray-700">{u.email}</td>
                          <td className="px-3 py-2 text-gray-700">{u.role}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {u.schoolName || u.schoolId}
                          </td>
                        </tr>
                      ))}
                      {!users.length && (
                        <tr>
                          <td className="px-3 py-3 text-gray-500" colSpan={4}>
                            No hay usuarios aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Grupos</h2>
                  <p className="text-sm text-gray-600">Crea grupos de usuarios para enviar mensajes</p>
                </div>
                {loadingGroups && <span className="text-sm text-gray-500">Cargando...</span>}
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
                    onChange={(e) =>
                      setGroupForm((prev) => ({ ...prev, description: e.target.value }))
                    }
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
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
                        <span className="text-gray-800">{u.name}</span>
                        <span className="text-gray-500 text-xs">({u.role})</span>
                      </label>
                    ))}
                    {!users.length && (
                      <p className="text-sm text-gray-500">No hay usuarios para seleccionar.</p>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingGroup}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {savingGroup ? 'Guardando...' : 'Crear grupo'}
                  </button>
                </div>
              </form>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Grupos creados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                    >
                      <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                      {g.description && (
                        <p className="text-xs text-gray-600 mb-1">{g.description}</p>
                      )}
                      <p className="text-xs text-gray-600">
                        Miembros: {g.memberIds?.length || 0} • Colegio: {g.schoolId}
                      </p>
                    </div>
                  ))}
                  {!groups.length && (
                    <div className="text-sm text-gray-500">No hay grupos registrados.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isGlobalAdmin && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Colegios</h2>
                    <p className="text-sm text-gray-600">Gestiona la lista de colegios</p>
                  </div>
                  {loadingSchools && <span className="text-sm text-gray-500">Cargando...</span>}
                </div>
                <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleCreateSchool}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                    <input
                      type="text"
                      value={schoolForm.id}
                      onChange={(e) => setSchoolForm((prev) => ({ ...prev, id: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                      placeholder="ej: school-123"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                      required
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSchool}
                      className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                    >
                      {savingSchool ? 'Guardando...' : 'Crear colegio'}
                    </button>
                  </div>
                </form>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Listado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {schools.map((s) => (
                      <div
                        key={s.id}
                        className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                      >
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-600">{s.id}</p>
                      </div>
                    ))}
                    {!schools.length && (
                      <div className="text-sm text-gray-500">No hay colegios registrados.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Importar colegio (CSV)</h2>
                    <p className="text-sm text-gray-600">
                      Sube un CSV con columnas name,email,role,password y asigna un colegio.
                    </p>
                  </div>
                </div>
                <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleImportCsv}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colegio ID</label>
                    <input
                      type="text"
                      value={schoolForm.id}
                      onChange={(e) => setSchoolForm((prev) => ({ ...prev, id: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                      placeholder="school-123"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del colegio</label>
                    <input
                      type="text"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                      placeholder="Nombre visible"
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Archivo CSV</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleCsvFile(e.target.files?.[0] || null)}
                      className="w-full text-sm"
                    />
                    {csvInfo.fileName && (
                      <p className="text-xs text-gray-600 mt-1">
                        {csvInfo.fileName} ({csvInfo.rows} filas)
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={importingCsv}
                      className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                    >
                      {importingCsv ? 'Importando...' : 'Importar CSV'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {!isAdmin && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Acceso limitado</h2>
              <p className="text-sm text-gray-600">
                Solo los administradores pueden gestionar usuarios y colegios. Si necesitas acceso,
                contacta a tu administrador.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
