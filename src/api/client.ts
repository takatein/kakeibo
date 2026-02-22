import { config } from './config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
}

/** API呼び出し基盤 */
async function request<T>({ method, path, body, params }: RequestOptions): Promise<T> {
  const url = new URL(`${config.api.baseUrl}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const token = localStorage.getItem('kakeibo_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>({ method: 'GET', path, params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>({ method: 'POST', path, body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>({ method: 'PUT', path, body }),

  delete: <T>(path: string) =>
    request<T>({ method: 'DELETE', path }),
};
