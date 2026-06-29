import { QueryClient, QueryFunction } from "@tanstack/react-query";

import { getPublicBaseUrl } from "@shared/publicUrl";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:5001/")
 */
export function getApiUrl(): string {
  if (!process.env.EXPO_PUBLIC_DOMAIN) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  return new URL(getPublicBaseUrl()).href;
}

/** Parse a JSON API response; avoids throwing on HTML error pages (e.g. 404). */
export async function parseApiJsonResponse(
  response: Response,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (response.status === 404) {
      return {
        ok: false,
        error: "Password reset is not available on this server yet. The backend needs to be updated.",
      };
    }
    return { ok: false, error: `Server error (${response.status}). Please try again later.` };
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      "Request failed";
    return { ok: false, error: message };
  }

  return { ok: true, data };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
