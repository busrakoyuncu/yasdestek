// The one way the app talks to the backend. Same-origin cookie auth, JSON
// bodies, and every failure becomes an ApiError whose `code` the UI translates.

const BASE = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = { body?: unknown; signal?: AbortSignal };

async function request<T>(
  method: string,
  path: string,
  { body, signal }: Options = {},
): Promise<T> {
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'same-origin',
      headers:
        isForm || body === undefined
          ? {}
          : { 'Content-Type': 'application/json' },
      body: isForm
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(0, 'NETWORK', 'Could not reach the server');
  }

  if (!res.ok) {
    const fallback = { code: 'UNKNOWN', message: res.statusText };
    const { code, message } = (await res
      .json()
      .catch(() => fallback)) as typeof fallback;
    throw new ApiError(
      res.status,
      code ?? 'UNKNOWN',
      message ?? res.statusText,
    );
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (
    type.includes('application/json') ? await res.json() : await res.text()
  ) as T;
}

export const api = {
  get: <T>(path: string, options?: Options) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: Options) =>
    request<T>('DELETE', path, options),
};
