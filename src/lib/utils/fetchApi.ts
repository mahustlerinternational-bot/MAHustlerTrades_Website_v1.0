// src/lib/utils/fetchApi.ts
// Universal fetch wrapper for admin/portal API calls

export async function fetchApi<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errorMsg = body.error ?? errorMsg;
      } catch {}
      return { data: null, error: errorMsg };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error(`fetchApi error [${url}]:`, msg);
    return { data: null, error: msg };
  }
}

// Ensure a value is always an array
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && 'data' in value && Array.isArray((value as any).data)) {
    return (value as any).data as T[];
  }
  return [];
}
