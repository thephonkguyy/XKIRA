import { useAuthStore } from "../store/authStore";

/**
 * Standard fetch wrapper that automatically appends the current session token
 * from useAuthStore to the request headers. Supports streaming, file uploads,
 * AbortController signals, and auto-fallback session refreshing on 401.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const cleanInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await fetch(input, cleanInit);

  // Automatically handle expired sessions if we get a 401 Unauthorized
  if (response.status === 401 && token) {
    console.warn("[authenticatedFetch] Received 401 Unauthorized. Refreshing session...");
    
    // Check and restore auth or fall back to Guest token
    await useAuthStore.getState().checkAuth();
    const newToken = useAuthStore.getState().token;

    if (newToken && newToken !== token) {
      console.log("[authenticatedFetch] Session restored/guest fallback succeeded. Retrying request once...");
      const retryHeaders = new Headers(init?.headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      return fetch(input, { ...init, headers: retryHeaders });
    }
  }

  return response;
}
