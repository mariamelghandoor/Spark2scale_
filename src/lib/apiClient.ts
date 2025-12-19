// Minimal typed API client using the browser fetch API.
// Mirrors a subset of AxiosResponse shape: { data: T }
// Works in Next client-side code and avoids adding axios as a dependency.

type ApiResponse<T> = { data: T };

const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    // Try to read error body if present
    let errBody: unknown = null;
    try {
      errBody = contentType.includes("application/json") ? await res.json() : await res.text();
    } catch {
      // ignore parse errors
    }
    throw new Error(`Request failed (${res.status}): ${JSON.stringify(errBody)}`);
  }

  // Some endpoints may return empty body
  if (res.status === 204) return { data: null as unknown as T };

  if (contentType.includes("application/json")) {
    const json = (await res.json()) as T;
    return { data: json };
  }

  // Fallback to text
  const text = (await res.text()) as unknown as T;
  return { data: text };
}

const apiClient = {
  async get<T = any>(url: string): Promise<ApiResponse<T>> {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: DEFAULT_HEADERS,
    });
    return handleResponse<T>(res);
  },

  async post<T = any>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T = any>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  // For DELETE with body (some servers expect a JSON body on DELETE).
  async delete<T = any>(url: string, options?: { data?: unknown }): Promise<ApiResponse<T>> {
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: DEFAULT_HEADERS,
      body: options?.data !== undefined ? JSON.stringify(options.data) : undefined,
    });
    return handleResponse<T>(res);
  },
};

export default apiClient;