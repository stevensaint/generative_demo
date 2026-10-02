import type { Command } from '../../../packages/contracts/src/state.js';
import { z } from 'zod';
import { ProductPackSchema } from '../../../packages/contracts/src/product-pack.js';
import { ApiErrorSchema, CreatedSessionSchema, HealthSchema, ProductPresentationSchema, SessionViewSchema, SnapshotSchema } from '../../../packages/contracts/src/index.js';
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
  pack: () => request('/api/product-pack/manifest', ProductPackSchema),
  demo: () => request('/api/demo-presentation', DemoPresentationSchema),
  start: () => request('/api/sessions', CreatedSessionSchema, 'POST'),
  read: (id: string, token: string) => request(`/api/sessions/${id}`, SessionViewSchema, 'GET', token),
  end: (id: string, token: string) => request(`/api/sessions/${id}/end`, SessionViewSchema, 'POST', token),
  command: (id: string, token: string, command: Command) => request(`/api/sessions/${id}/commands`, SessionViewSchema, 'POST', token, command),
  snapshot: (id: string, token: string) => request(`/api/sessions/${id}/snapshot`, SnapshotSchema, 'GET', token),
  navigate: (id: string, token: string, target: NavigationTarget) => request(`/api/sessions/${id}/navigation`, SessionViewSchema, 'POST', token, target),
};
