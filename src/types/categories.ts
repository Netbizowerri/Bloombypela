/**
 * Shared catalogue category type.
 * NOTE: products store `category` as a plain string on the Product document;
 * this type describes the canonical category catalogue maintained by the admin.
 */
export interface Category {
  id: string;
  name: string; // e.g. "Snacks", "Fresh juices"
  slug: string; // e.g. "snacks", "juices"
  description?: string;
  status: 'active' | 'hidden';
}
