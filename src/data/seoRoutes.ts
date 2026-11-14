/**
 * Single source of truth for the indexable storefront routes.
 *
 * Shared by the in-app `<RouteSeo>` component, `scripts/sitemap.ts` and the
 * build-time prerenderer, so the canonical URL, title and description of a
 * static route can never drift between the HTML, the sitemap and the SPA.
 *
 * Product pages and the staff-editable content pages are resolved from
 * Firestore at build time, so they are not listed here.
 */
export interface SeoRoute {
  /** Site-root path, e.g. "/delivery". */
  path: string;
  title: string;
  description: string;
  /** Excluded from search indexes and from the sitemap. */
  noindex?: boolean;
  priority?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export const SEO_ROUTES: SeoRoute[] = [
  {
    path: '/',
    title: 'Bloom by Pela | Life in Every Bite & Life in Every Sip',
    description:
      'Premium packaged snacks and fresh cold-pressed juices, handcrafted in Newcastle upon Tyne, UK. Local delivery and collection.',
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/shop',
    title: 'Shop All Snacks & Cold-Pressed Juices',
    description:
      'Browse every Bloom by Pela snack and cold-pressed juice, with prices in GBP and allergen information on each product.',
    priority: '0.9',
    changefreq: 'weekly',
  },
  {
    path: '/shop/snacks',
    title: 'Nigerian Snacks',
    description:
      'Plantain chips, chin chin, groundnut and more, sourced from Nigerian smallholders and packed in Newcastle upon Tyne.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/shop/juices',
    title: 'Fresh Cold-Pressed Juices',
    description:
      'Raw, unpasteurised cold-pressed juices and ginger shots, pressed in small batches in Newcastle upon Tyne.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/subscriptions',
    title: 'Weekly Juice Subscriptions',
    description:
      'A weekly box of cold-pressed juices delivered across Newcastle upon Tyne. Pause or cancel from your account.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/about',
    title: 'About Bloom by Pela',
    description:
      'Bloom by Pela is a Newcastle upon Tyne kitchen making premium packaged snacks and fresh cold-pressed juices.',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: '/delivery',
    title: 'Delivery Information & Areas',
    description:
      'Newcastle delivery postcodes, fees, minimum order values and cut-off times, read live from our current delivery settings.',
    priority: '0.7',
    changefreq: 'weekly',
  },
  {
    path: '/allergens',
    title: 'Allergen Information',
    description:
      'The 14 major UK allergens for every Bloom by Pela product, so you can check before you order.',
    priority: '0.7',
    changefreq: 'weekly',
  },
  {
    path: '/contact',
    title: 'Contact Us',
    description:
      'Questions about an order, bulk snacks, weekly juice subscriptions or allergens? Contact the Bloom by Pela team in Newcastle.',
    priority: '0.6',
    changefreq: 'yearly',
  },
  {
    path: '/faqs',
    title: 'Frequently Asked Questions',
    description:
      'Answers about ordering, Newcastle delivery, collection and weekly juice subscriptions.',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    path: '/terms',
    title: 'Terms and Conditions',
    description:
      'The terms that apply when you order snacks or cold-pressed juices from Bloom by Pela.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description:
      'How Bloom by Pela collects, uses and protects your personal data under the UK GDPR.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/subscription-terms',
    title: 'Subscription Terms',
    description: 'How weekly juice subscriptions are billed, paused and cancelled.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/returns',
    title: 'Delivery and Returns Policy',
    description: 'Delivery coverage, fees and what to do if something is wrong with your order.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  // Transactional screens: reachable, never indexed.
  { path: '/checkout', title: 'Checkout', description: 'Secure checkout.', noindex: true },
  { path: '/checkout/success', title: 'Order Confirmed', description: 'Your order.', noindex: true },
  { path: '/checkout/cancel', title: 'Checkout Cancelled', description: 'Checkout.', noindex: true },
  { path: '/orders/track', title: 'Track Your Order', description: 'Order lookup.', noindex: true },
  { path: '/account', title: 'Your Account', description: 'Your account.', noindex: true },
  { path: '/login', title: 'Sign In', description: 'Sign in.', noindex: true },
  { path: '/register', title: 'Create an Account', description: 'Create an account.', noindex: true },
  { path: '/forgot-password', title: 'Reset Your Password', description: 'Password reset.', noindex: true },
  { path: '/access-denied', title: 'Access Denied', description: 'Access denied.', noindex: true },
];
