import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string | undefined
});

api.interceptors.request.use((config) => {
  // Attach bearer token from Firebase Auth if available later
  const token = (window as any).__authToken as string | undefined;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export async function get<T>(url: string): Promise<T> {
  const { data } = await api.get<T>(url);
  return data;
}

export default api;






