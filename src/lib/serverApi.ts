import { auth } from './firebase';
import { z } from 'zod';

const apiErrorSchema = z.object({ error: z.string() });

/**
 * Resolves the checkout API origin. Production builds must configure it: there
 * is no hard-coded fallback, so a missing variable fails loudly instead of
 * silently posting customer data to an unintended host.
 */
function resolveBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_CHECKOUT_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3001';
  throw new Error('Checkout API URL is not configured.');
}

export async function postServerApi<TRequest, TResponse>(
  path: string,
  payload: TRequest,
): Promise<{ data: TResponse }> {
  const baseUrl = resolveBaseUrl();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await auth?.currentUser?.getIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(responseText) as unknown;
  } catch {
    if (response.ok) {
      throw new Error('Checkout API returned an invalid response.');
    }
  }
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new Error(
      parsed.success ? parsed.data.error : `Checkout API request failed (${response.status}).`,
    );
  }
  if (body === null) {
    throw new Error('Checkout API returned an invalid response.');
  }

  return { data: body as TResponse };
}
