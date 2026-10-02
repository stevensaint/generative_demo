import { z } from 'zod';
import { ApiErrorSchema, CreatedSessionSchema, HealthSchema, ProductPresentationSchema, SessionViewSchema } from '../../../packages/contracts/src/index.js';
import { DemoPresentationSchema, type NavigationTarget } from '../../../packages/contracts/src/presentation.js';

async function request<T>(path: string, schema: z.ZodType<T>, method = 'GET', accessToken?: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method,
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const responseBody: unknown = await response.json();
  if (!response.ok) throw new Error(ApiErrorSchema.parse(responseBody).error.message);
  return schema.parse(responseBody);
}
export const api = {
  health: () => request('/api/health', HealthSchema),
  presentation: () => request('/api/product-pack', ProductPresentationSchema),
  demo: () => request('/api/demo-presentation', DemoPresentationSchema),
  start: () => request('/api/sessions', CreatedSessionSchema, 'POST'),
  read: (id: string, token: string) => request(`/api/sessions/${id}`, SessionViewSchema, 'GET', token),
  end: (id: string, token: string) => request(`/api/sessions/${id}/end`, SessionViewSchema, 'POST', token),
  navigate: (id: string, token: string, target: NavigationTarget) => request(`/api/sessions/${id}/navigation`, SessionViewSchema, 'POST', token, target),
};
