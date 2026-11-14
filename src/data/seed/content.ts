/**
 * Seed copy for the staff-editable `content` collection.
 *
 * Every page is PLACEHOLDER text that the client and their advisers must
 * approve. The renderer shows a "PLACEHOLDER - REVIEW BY CLIENT" banner while
 * `placeholder` stays true.
 */
export interface SeedContentPage {
  id: string;
  title: string;
  description: string;
  bodyHtml: string;
  published: boolean;
  placeholder: boolean;
}

const notice =
  '<p><strong>PLACEHOLDER - REVIEW BY CLIENT.</strong> This copy is a draft for review by Bloom by Pela and its advisers. It must be approved before launch and does not yet constitute a legal policy.</p>';

export const SEED_CONTENT: SeedContentPage[] = [
  {
    id: 'faqs',
    title: 'Frequently Asked Questions',
    description:
      'Answers about ordering, Newcastle delivery, collection and weekly juice subscriptions.',
    published: true,
    placeholder: true,
    bodyHtml: `${notice}
<h2>Ordering</h2>
<p>Browse the shop, add items to your basket and pay securely at checkout. PLACEHOLDER - REVIEW BY CLIENT: describe accepted payment methods and order confirmation.</p>
<h2>Delivery</h2>
<p>Local delivery runs across the Newcastle upon Tyne postcodes listed on our delivery page. PLACEHOLDER - REVIEW BY CLIENT: confirm delivery days and cut-off times.</p>
<h2>Collection</h2>
<p>Collection details are shown at checkout when collection is available. PLACEHOLDER - REVIEW BY CLIENT: confirm collection location and opening hours.</p>
<h2>Subscriptions</h2>
<p>Weekly juice subscriptions renew automatically until paused or cancelled. PLACEHOLDER - REVIEW BY CLIENT: confirm billing day, pause rules and cancellation notice.</p>
<h2>Allergens</h2>
<p>Every product page lists the 14 major UK allergens that apply, and the allergen matrix lists them per product. PLACEHOLDER - REVIEW BY CLIENT: confirm cross-contact wording for the production kitchen.</p>`,
  },
  {
    id: 'terms',
    title: 'Terms and Conditions',
    description:
      'The terms that apply when you order snacks or cold-pressed juices from Bloom by Pela.',
    published: true,
    placeholder: true,
    bodyHtml: `${notice}
<h2>1. About us</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: registered company name, company number, registered address and contact email.</p>
<h2>2. Orders and pricing</h2>
<p>Prices are shown in pounds sterling (GBP) and include VAT where applicable. PLACEHOLDER - REVIEW BY CLIENT: confirm VAT position and pricing policy.</p>
<h2>3. Perishable goods</h2>
<p>Cold-pressed juices are fresh and perishable. PLACEHOLDER - REVIEW BY CLIENT: confirm refrigeration, shelf-life and cancellation-rights wording with a legal adviser.</p>
<h2>4. Subscriptions</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: renewal, pause, skip and cancellation terms for weekly juice subscriptions.</p>
<h2>5. Liability and governing law</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: liability, complaints procedure and governing law (England and Wales).</p>`,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description:
      'How Bloom by Pela collects, uses and protects your personal data under the UK GDPR.',
    published: true,
    placeholder: true,
    bodyHtml: `${notice}
<h2>1. Data controller</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: legal entity name and contact details for data protection enquiries.</p>
<h2>2. What we collect</h2>
<p>We collect the details needed to take payment and deliver your order: name, email address, telephone number, delivery address and order history. Card details are handled by our payment provider and are never stored by us.</p>
<h2>3. Why we use it</h2>
<p>We process your data to fulfil your order, to meet accounting and food-safety obligations, and (only with your consent) to measure how the site is used. PLACEHOLDER - REVIEW BY CLIENT: confirm lawful bases and retention periods.</p>
<h2>4. Your rights</h2>
<p>You can export or delete your account data from your account page, or email us to exercise your rights of access, rectification, erasure, restriction and portability.</p>
<h2>5. Cookies</h2>
<p>Essential cookies keep your basket and sign-in working. Analytics cookies are optional and load only after you accept them; you can change your choice at any time from the footer.</p>`,
  },
  {
    id: 'subscription-terms',
    title: 'Subscription Terms',
    description: 'How weekly juice subscriptions are billed, paused and cancelled.',
    published: true,
    placeholder: true,
    bodyHtml: `${notice}
<h2>Billing</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: billing frequency and the day payments are taken.</p>
<h2>Pausing and skipping</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: how far in advance a pause or skip must be requested.</p>
<h2>Cancelling</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: cancellation route and notice period.</p>`,
  },
  {
    id: 'returns',
    title: 'Delivery and Returns Policy',
    description: 'Delivery coverage, fees and what to do if something is wrong with your order.',
    published: true,
    placeholder: true,
    bodyHtml: `${notice}
<h2>Delivery</h2>
<p>Delivery areas, fees and minimum spend are listed on our delivery information page and are read live from our current settings.</p>
<h2>Perishable items</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: returns position for fresh juices and other perishable goods.</p>
<h2>Problems with an order</h2>
<p>PLACEHOLDER - REVIEW BY CLIENT: how quickly a customer must report an issue and how refunds or replacements are handled.</p>`,
  },
];
