// src/lib/apiClient.ts
// Minimal typed API client.
// Attaches Bearer token from localStorage automatically.
// Mirrors AxiosResponse shape: { data: T }

type ApiResponse<T> = { data: T; status: number };

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    let errBody: unknown = null;
    try {
      errBody = contentType.includes("application/json")
        ? await res.json()
        : await res.text();
    } catch {
      // ignore
    }
    throw new Error(`Request failed (${res.status}): ${JSON.stringify(errBody)}`);
  }
  if (res.status === 204) return { data: null as unknown as T, status: res.status };
  if (contentType.includes("application/json")) {
    return { data: (await res.json()) as T, status: res.status };
  }
  return { data: (await res.text()) as unknown as T, status: res.status };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5231";

const apiClient = {
  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
    });
    return handleResponse<T>(res);
  },

  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    const headers = getAuthHeaders(
      isFormData ? options?.headers : { "Content-Type": "application/json", ...options?.headers }
    );
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    const headers = getAuthHeaders(
      isFormData ? options?.headers : { "Content-Type": "application/json", ...options?.headers }
    );
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      credentials: "include",
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    const headers = getAuthHeaders(
      isFormData ? options?.headers : { "Content-Type": "application/json", ...options?.headers }
    );
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      credentials: "include",
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async delete<T = unknown>(
    path: string,
    options?: { data?: unknown }
  ): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: options?.data !== undefined ? JSON.stringify(options.data) : undefined,
    });
    return handleResponse<T>(res);
  },
};

export default apiClient;