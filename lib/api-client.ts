import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.notiflow.app';

class APIClient {
  client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
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
  async sendMessage(data: any) {
    return this.client.post('/messages/send', data);
  }

  async scheduleMessage(data: any) {
    return this.client.post('/messages/schedule', data);
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
  }) {
    return this.client.post('/users', data);
  }

  async getSchools() {
    return this.client.get('/schools');
  }

  async createSchool(data: { id: string; name: string }) {
    return this.client.post('/schools', data);
  }

  async getGroups(schoolId?: string) {
    return this.client.get('/groups', { params: { schoolId } });
  }

  async createGroup(data: {
    name: string;
    description?: string;
    memberIds: string[];
    schoolId?: string;
  }) {
    return this.client.post('/groups', data);
  }

  async forgotPassword(email: string) {
    return this.client.post('/auth/forgot', { email });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.client.post('/auth/reset', { token, newPassword });
  }
}

export const apiClient = new APIClient();
