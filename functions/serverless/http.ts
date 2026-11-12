import type { VercelRequest, VercelResponse } from '@vercel/node';

const allowedOrigins = new Set([
  'https://bloombypela.com',
  'https://www.bloombypela.com',
  'https://bloombypela.vercel.app',
  'https://bloombypela-ec784.web.app',
  'https://bloombypela-ec784.firebaseapp.com',
  'https://bloombypela.web.app',
  'https://www.bloombypela.web.app',
  'https://bloombypela.firebaseapp.com',
  'https://www.bloombypela.firebaseapp.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
]);

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (origin && !allowedOrigins.has(origin) && !configuredOrigins.includes(origin)) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return true;
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}

export function requestIp(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim() || 'unknown';
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export function sendMethodNotAllowed(res: VercelResponse): void {
  res.status(405).json({ error: 'Method not allowed.' });
}
