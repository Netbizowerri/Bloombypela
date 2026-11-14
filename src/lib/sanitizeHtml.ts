import DOMPurify from 'dompurify';

export const CONTENT_ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'a',
  'blockquote',
] as const;

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...CONTENT_ALLOWED_TAGS],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'img'],
    FORBID_ATTR: ['style', 'srcset', 'onerror', 'onclick'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
  });
}
