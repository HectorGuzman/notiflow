'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Modal } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, useYearStore } from '@/store';

type Template = {
  id: string;
  name: string;
  content: string;
};

export default function NewMessagePage() {
  const { year } = useYearStore();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission('messages.create');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [channels, setChannels] = useState<string[]>(['email', 'app']);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [groups, setGroups] = useState<{ id: string; name: string; memberIds: string[] }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  useEffect(() => {
    if (!canCreate) return;
    const loadUsers = async () => {
      setLoadingUsers(true);
      setUsersError('');
      try {
        const res = await apiClient.getUsers();
        setUsers(res.data || []);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'No se pudieron cargar los usuarios';
        setUsersError(msg);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
    const loadGroups = async () => {
      setLoadingGroups(true);
      setGroupsError('');
      try {
        const res = await apiClient.getGroups(undefined, year);
        setGroups(res.data || []);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'No se pudieron cargar los grupos';
        setGroupsError(msg);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
  }, [canCreate, year]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    const emails = users
      .filter((u) => selectedUserIds.includes(u.id))
      .map((u) => u.email)
      .filter(Boolean);
    if (!emails.length) {
      setSendError('Selecciona al menos un usuario con correo.');
      return;
    }
    if (!channels.length) {
      setSendError('Selecciona al menos un canal de envío.');
      return;
    }
    if (sendMode === 'schedule' && !scheduleAt) {
      setSendError('Selecciona fecha y hora para programar.');
      return;
    }
    setSendLoading(true);
    setSendError('');
    setSendSuccess('');
    apiClient
      .sendMessage({
        content: messageContent,
        recipients: emails,
        channels,
        scheduleAt: sendMode === 'schedule' ? scheduleAt : undefined,
        year,
      })
      .then((res) => {
        const status = res?.data?.status || res?.data?.messageStatus || '';
        if (status && status.toLowerCase() === 'failed') {
          setSendError('El backend no pudo entregar el mensaje (estado FAILED). Revisa logs o configuración de correo.');
          return;
        }
        setSendSuccess(sendMode === 'now' ? 'Mensaje enviado.' : 'Mensaje programado.');
        setSelectedUserIds([]);
        setSelectedGroups([]);
        setMessageContent('');
        setScheduleAt('');
        setAttachedFile(null);
      })
      .catch((err: any) => {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'No se pudo enviar el mensaje';
        setSendError(msg);
      })
      .finally(() => setSendLoading(false));
  };

  const handleApplyTemplate = (templateId: string) => {
    const found = templates.find((t) => t.id === templateId);
    if (found) {
      setSelectedTemplate(templateId);
      setMessageContent(found.content);
    }
  };

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      content: newTemplateContent.trim(),
    };
    setTemplates([newTemplate, ...templates]);
    setNewTemplateName('');
    setNewTemplateContent('');
    setSelectedTemplate(newTemplate.id);
    setMessageContent(newTemplate.content);
  };

  const handleStartEdit = (tpl: Template) => {
    setEditingTemplateId(tpl.id);
    setEditName(tpl.name);
    setEditContent(tpl.content);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingTemplateId || !editName.trim() || !editContent.trim()) return;
    setTemplates((prev) =>
      prev.map((tpl) =>
        tpl.id === editingTemplateId
          ? { ...tpl, name: editName.trim(), content: editContent.trim() }
          : tpl
      )
    );
    if (selectedTemplate === editingTemplateId) {
      setMessageContent(editContent.trim());
    }
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditName('');
    setEditContent('');
    setShowEditModal(false);
  };

  const handleDeleteTemplate = (id: string) => {
    setDeleteTarget(templates.find((tpl) => tpl.id === id) || null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setTemplates((prev) => prev.filter((tpl) => tpl.id !== deleteTarget.id));
    if (selectedTemplate === deleteTarget.id) {
      setSelectedTemplate(null);
    }
    if (editingTemplateId === deleteTarget.id) {
      handleCancelEdit();
    }
    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const toggleGroup = (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (!group) {
      setSelectedGroups((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
      return;
    }
    const memberIds = group.memberIds || [];
    const allSelected = memberIds.length > 0 && memberIds.every((m) => selectedUserIds.includes(m));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !memberIds.includes(id)));
      setSelectedGroups((prev) => prev.filter((r) => r !== id));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...memberIds])));
      setSelectedGroups((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const term = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
    );
  }, [search, users]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyFormat = (prefix: string, suffix?: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = messageContent.slice(0, start);
    const selected = messageContent.slice(start, end);
    const after = messageContent.slice(end);
    const sfx = suffix ?? prefix;
    const next = `${before}${prefix}${selected}${sfx}${after}`;
    setMessageContent(next);
    const cursor = start + prefix.length + selected.length + sfx.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const toggleSelectFiltered = () => {
    const ids = filteredUsers.map((u) => u.id);
    const allSelected = ids.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  if (!canCreate) {
    return (
      <ProtectedLayout>
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin permisos</h1>
          <p className="text-gray-600">
            No tienes permisos para crear mensajes. Si crees que es un error, contacta al
            administrador.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/messages"
              className="inline-flex px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Ver historial
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Ir al dashboard
            </Link>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">Redactar</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              Nuevo Mensaje
            </h1>
            <p className="text-gray-600 mt-1">Envía un mensaje inmediato o prográmalo</p>
          </div>
          <Link
            href="/messages"
            className="text-primary hover:text-green-800 transition-colors text-sm sm:text-base"
          >
            ← Volver
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-8">
          {(sendError || sendSuccess) && (
            <div className="mb-4 space-y-2">
              {sendError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {sendError}
                </div>
              )}
              {sendSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {sendSuccess}
                </div>
              )}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 1. Plantillas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">1. Plantillas</h2>
                <p className="text-sm text-gray-600">Aplica o crea mensajes frecuentes.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(true)}
                className="px-4 py-2 border border-primary text-primary rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                Utilizar plantilla
              </button>
            </div>

            {/* 2. Mensaje */}
            <div className="space-y-3 border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">2. Mensaje</h2>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Formato rápido:</span>
                  <button
                    type="button"
                    onClick={() => applyFormat('**')}
                    className="px-2 py-1 border border-gray-300 rounded hover:border-primary"
                  >
                    <span className="font-semibold">B</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('_')}
                    className="px-2 py-1 border border-gray-300 rounded hover:border-primary italic"
                  >
                    I
                  </button>
                </div>
              </div>
              <textarea
                placeholder="Escribe tu mensaje aquí..."
                className="w-full px-4 py-2.5 border rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200 bg-white hover:border-gray-300 h-32 resize-none"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                maxLength={1000}
                required
                ref={textareaRef}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
                <span className="text-gray-500">{messageContent.length} / 1000 caracteres</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-1/2">
                  <label className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition ${channels.includes('email') ? 'border-primary bg-green-50' : 'border-gray-200 hover:border-primary'}`}>
                    <input
                      type="checkbox"
                      name="channel-email"
                      value="email"
                      checked={channels.includes('email')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChannels((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add('email');
                          else next.delete('email');
                          return Array.from(next);
                        });
                      }}
                      className="text-primary"
                    />
                    <span className="flex items-center gap-1">
                      <span className="text-lg">📧</span>
                      <span>Email</span>
                    </span>
                  </label>
                  <label className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition ${channels.includes('app') ? 'border-primary bg-green-50' : 'border-gray-200 hover:border-primary'}`}>
                    <input
                      type="checkbox"
                      name="channel-app"
                      value="app"
                      checked={channels.includes('app')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChannels((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add('app');
                          else next.delete('app');
                          return Array.from(next);
                        });
                      }}
                      className="text-primary"
                    />
                    <span className="flex items-center gap-1">
                      <span className="text-lg">📲</span>
                      <span>Notiflow App</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Destinatarios */}
            <div className="space-y-3 border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">3. Destinatarios</h2>
                {(selectedUserIds.length > 0 || selectedGroups.length > 0) && (
                  <span className="text-xs text-gray-600">
                    {selectedUserIds.length} usuario(s) • {selectedGroups.length} grupo(s)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {groups.map((grp) => (
                  <label key={grp.id} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:border-primary cursor-pointer">
                    <input
                      type="checkbox"
                      className="text-primary"
                      checked={selectedGroups.includes(grp.id)}
                      onChange={() => toggleGroup(grp.id)}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{grp.name}</p>
                      <p className="text-xs text-gray-500">{grp.memberIds?.length || 0} miembro(s)</p>
                    </div>
                  </label>
                ))}
                {!groups.length && (
                  <p className="text-sm text-gray-500 col-span-2">No hay grupos disponibles.</p>
                )}
                {loadingGroups && (
                  <p className="text-sm text-gray-500 col-span-2">Cargando grupos...</p>
                )}
                {groupsError && (
                  <p className="text-sm text-red-600 col-span-2">{groupsError}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nombre o email"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={toggleSelectFiltered}
                      className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:border-primary hover:text-primary transition-colors"
                    >
                      {filteredUsers.length &&
                      filteredUsers.every((u) => selectedUserIds.includes(u.id))
                        ? 'Deseleccionar visibles'
                        : 'Seleccionar visibles'}
                    </button>
                    <span className="text-xs text-gray-500">{filteredUsers.length} resultado(s)</span>
                  </div>
                </div>
                {loadingUsers && <p className="text-sm text-gray-500">Cargando usuarios...</p>}
                {usersError && <p className="text-sm text-red-600">{usersError}</p>}
                {!loadingUsers && !usersError && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-auto pr-1">
                    {filteredUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:border-primary cursor-pointer">
                        <input
                          type="checkbox"
                          className="text-primary"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </label>
                    ))}
                    {!users.length && (
                      <p className="text-sm text-gray-500 col-span-2">No hay usuarios disponibles.</p>
                    )}
                    {users.length > 0 && !filteredUsers.length && (
                      <p className="text-sm text-gray-500 col-span-2">Sin coincidencias para la búsqueda.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Envío */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-200 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enviar Ahora
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="schedule"
                    value="now"
                    checked={sendMode === 'now'}
                    onChange={() => setSendMode('now')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enviar inmediatamente</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Programar
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="schedule"
                    value="schedule"
                    checked={sendMode === 'schedule'}
                    onChange={() => setSendMode('schedule')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Programar para después</span>
                </label>
                {sendMode === 'schedule' && (
                  <div className="mt-2">
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 5. Adjuntos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-200 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
                {attachedFile && (
                  <p className="text-xs text-gray-600 mt-1">
                    {attachedFile.name} ({Math.round(attachedFile.size / 1024)} KB)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento (opcional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
                {docFile && (
                  <p className="text-xs text-gray-600 mt-1">
                    {docFile.name} ({Math.round(docFile.size / 1024)} KB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={sendLoading}
                className={`w-full sm:flex-1 px-6 py-2.5 bg-primary text-white rounded-lg font-medium transition-colors ${
                  sendLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'
                }`}
              >
                {sendLoading
                  ? 'Enviando...'
                  : sendMode === 'now'
                    ? 'Enviar Mensaje'
                    : 'Programar Mensaje'}
              </button>
              <Link
                href="/messages"
                className="w-full sm:flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>

      <Modal
        isOpen={showTemplatesModal}
        title="Seleccionar plantilla"
        onClose={() => setShowTemplatesModal(false)}
        onConfirm={() => setShowTemplatesModal(false)}
        confirmText="Cerrar"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Elige una plantilla para rellenar el mensaje o crea una nueva.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-auto pr-1">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  handleApplyTemplate(tpl.id);
                  setShowTemplatesModal(false);
                }}
                className={`text-left border rounded-lg p-3 hover:border-primary transition-colors ${
                  selectedTemplate === tpl.id ? 'border-primary bg-green-50' : 'border-gray-200'
                }`}
              >
                <p className="font-semibold text-gray-900 mb-1">{tpl.name}</p>
                <p className="text-sm text-gray-600 line-clamp-3">{tpl.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(tpl);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Editar
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(tpl.id);
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              </button>
            ))}
            {!templates.length && (
              <p className="text-sm text-gray-500 col-span-2">No hay plantillas aún.</p>
            )}
          </div>
          <div className="border border-dashed border-gray-300 rounded-lg p-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de plantilla
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Ej: Aviso feriado"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenido
              </label>
              <input
                type="text"
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                placeholder="Mensaje breve para reutilizar"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddTemplate}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Agregar plantilla
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        title="Editar plantilla"
        onClose={handleCancelEdit}
        onConfirm={handleSaveEdit}
        confirmText="Guardar cambios"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent border-gray-200 resize-none h-28"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        title="Eliminar plantilla"
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar"
      >
        <p className="text-sm text-gray-700">
          ¿Deseas eliminar la plantilla{' '}
          <span className="font-semibold">{deleteTarget?.name}</span>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </ProtectedLayout>
  );
}
