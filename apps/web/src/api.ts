import { z } from 'zod';
import { ApiErrorSchema, CreatedSessionSchema, HealthSchema, ProductPresentationSchema, SessionViewSchema } from '../../../packages/contracts/src/index.js';

async function request<T>(path: string, schema: z.ZodType<T>, method = 'GET', accessToken?: string): Promise<T> {
  const response = await fetch(path, { method, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(ApiErrorSchema.parse(body).error.message);
  return schema.parse(body);
}
export const api = {
  health: () => request('/api/health', HealthSchema),
  presentation: () => request('/api/product-pack', ProductPresentationSchema),
  start: () => request('/api/sessions', CreatedSessionSchema, 'POST'),
  read: (id: string, token: string) => request(`/api/sessions/${id}`, SessionViewSchema, 'GET', token),
  end: (id: string, token: string) => request(`/api/sessions/${id}/end`, SessionViewSchema, 'POST', token),
};
