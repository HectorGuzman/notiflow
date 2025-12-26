import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.notiflow.app';

class APIClient {
  client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 20000, // aumentamos timeout para conexiones lentas a Cloud Run
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token de autenticación
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor para manejo de errores
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Autenticación
  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }

  async getAuthMe() {
    return this.client.get('/auth/me');
  }

  async logout() {
    return this.client.post('/auth/logout');
  }

  // Mensajes
  async sendMessage(data: {
    content: string;
    recipients: string[];
    channels: string[];
    scheduleAt?: string;
    year?: string;
    reason?: string;
    attachments?: {
      fileName: string;
      mimeType: string;
      base64: string;
      inline?: boolean;
      cid?: string;
    }[];
  }) {
    return this.client.post('/messages', data);
  }

  // Plantillas
  async getTemplates() {
    return this.client.get('/templates');
  }

  async createTemplate(data: { name: string; content: string }) {
    return this.client.post('/templates', data);
  }

  async updateTemplate(id: string, data: { name: string; content: string }) {
    return this.client.put(`/templates/${id}`, data);
  }

  async deleteTemplate(id: string) {
    return this.client.delete(`/templates/${id}`);
  }

  // Uso / métricas
  async getUsageMetrics() {
    return this.client.get('/reports/usage');
  }

  async getMessages(params?: any) {
    return this.client.get('/messages', { params });
  }

  async getMessageById(id: string) {
    return this.client.get(`/messages/${id}`);
  }

  async deleteMessage(id: string) {
    return this.client.delete(`/messages/${id}`);
  }

  // Datos de escuela
  async getSchoolData() {
    return this.client.get('/school');
  }

  async getSchoolById(id: string) {
    return this.client.get(`/schools/${id}`);
  }

  async updateSchool(id: string, data: { name: string; currentYear?: string; logoUrl?: string }) {
    return this.client.put(`/schools/${id}`, data);
  }

  async createSchool(data: { id: string; name: string; currentYear?: string; logoUrl?: string }) {
    return this.client.post('/schools', data);
  }

  async uploadSchoolLogo(id: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.client.post(`/schools/${id}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async getStudents(courseId?: string) {
    return this.client.get('/students', { params: { courseId } });
  }

  async getCourses(levelId?: string) {
    return this.client.get('/courses', { params: { levelId } });
  }

  async getLevels() {
    return this.client.get('/levels');
  }

  // Usuarios
  async getCurrentUser() {
    return this.client.get('/auth/me');
  }

  async getUsers(role?: string) {
    return this.client.get('/users', { params: { role } });
  }

  async createUser(data: {
    name: string;
    email: string;
    role: string;
    schoolId: string;
    schoolName: string;
    password: string;
    rut: string;
  }) {
    return this.client.post('/users', data);
  }

  async deleteUser(id: string) {
    return this.client.delete(`/users/${id}`);
  }

  async getSchools() {
    return this.client.get('/schools');
  }

  async getGroups(schoolId?: string, year?: string) {
    return this.client.get('/groups', { params: { schoolId, year } });
  }

  // Eventos
  async getEvents(params?: { from?: string; to?: string; type?: string }) {
    return this.client.get('/events', { params });
  }

  async createEvent(data: {
    title: string;
    description?: string;
    startDateTime: string;
    endDateTime?: string;
    type?: string;
    audience?: { userIds?: string[]; groupIds?: string[] };
  }) {
    return this.client.post('/events', data);
  }

  async createGroup(data: {
    name: string;
    description?: string;
    memberIds: string[];
    schoolId?: string;
    year?: string;
  }) {
    return this.client.post('/groups', data);
  }

  async updateGroup(
    id: string,
    data: {
      name: string;
      description?: string;
      memberIds: string[];
      schoolId?: string;
      year?: string;
    }
  ) {
    return this.client.put(`/groups/${id}`, data);
  }

  async deleteGroup(id: string) {
    return this.client.delete(`/groups/${id}`);
  }

  async forgotPassword(email: string) {
    return this.client.post('/auth/forgot', { email });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.client.post('/auth/reset', { token, newPassword });
  }

  // IA (Vertex)
  async aiRewriteModerate(text: string, subject?: string, tone?: string) {
    return this.client.post('/ai/rewrite-moderate', { text, subject, tone });
  }

  async getAiPolicy() {
    return this.client.get('/ai/policy');
  }

  async updateAiPolicy(data: { rewritePrompt: string; moderationRules: string[] }) {
    return this.client.put('/ai/policy', data);
  }
}

export const apiClient = new APIClient();
