export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function adminRequest<T = any>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok) throw new AdminApiError(result?.message ?? "Không thể hoàn tất thao tác.", response.status);
  return (result?.data ?? result) as T;
}
