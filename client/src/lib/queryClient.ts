import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiGet } from "./api-client";

// Legacy functions maintained for backward compatibility
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
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
  <T>({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Use our new API client with auth headers
      return await apiGet<T>(queryKey[0] as string);
    } catch (error) {
      // Handle 401 errors based on the specified behavior
      if (error instanceof Error && 
          error.message.includes('401') && 
          unauthorizedBehavior === "returnNull") {
        return null as unknown as T;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Fix: Reduce staleTime for chat messages to enable proper cache invalidation
      staleTime: 0, // Always refetch for messages
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
