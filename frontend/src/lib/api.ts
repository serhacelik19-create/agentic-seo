/**
 * Centralized API configuration and BFF Proxy client for Agentic SEO Frontend.
 * Ensures secret API keys are never exposed to browser client JavaScript.
 */

export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
).replace(/\/$/, '');

/**
 * Returns the API URL for a given endpoint path.
 * On client-side, routes through Next.js secure BFF Proxy (/api/proxy/...).
 * On server-side, targets backend directly.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.replace(/^\/api\//, '').replace(/^\//, '');

  if (typeof window !== 'undefined') {
    // Client-side: Route through secure Next.js API Proxy handler
    return `/api/proxy/${cleanEndpoint}`;
  }

  // Server-side: Target backend directly
  return `${BACKEND_URL}/api/${cleanEndpoint}`;
}

/**
 * Constructs an EventSource URL routing securely through Next.js proxy.
 */
export function getEventSourceUrl(endpoint: string): string {
  return getApiUrl(endpoint);
}

/**
 * Returns headers dictionary with server-side or custom authorization headers.
 */
export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  // If executing on server-side (Next.js server), inject secret ADMIN_API_KEY
  if (typeof window === 'undefined') {
    const serverKey = process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_API_KEY;
    if (serverKey && !headers['x-api-key']) {
      headers['x-api-key'] = serverKey;
    }
  }

  return headers;
}

/**
 * Custom fetch wrapper with default headers and error handling.
 */
export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = getApiUrl(endpoint);
  const headers = getAuthHeaders({
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  });

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData.error || errData.message) {
        errorMessage = errData.error || errData.message;
      }
    } catch {
      // Ignore JSON parse errors for non-JSON responses
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
