/**
 * Seed copy for the staff-editable `content` collection.
 *
 * Legal and policy pages for Bloom by Pela, a Newcastle upon Tyne-based
 * premium snack and cold-pressed juice business. Copy is written for a UK
 * audience, prices in GBP, and references UK GDPR and the law of England
 * and Wales. Returns are accepted within 24 hours of delivery or
 * collection for perishable items where a fault is reported.
 *
 * `placeholder` is false so the pages render without the review banner.
 */

export interface SeedContentPage {
  id: string;
  title: string;
  description: string;
  bodyHtml: string;
  published: boolean;
  placeholder: boolean;
}

const businessName = 'Bloom by Pela';
const businessAddress =
  'Bloom by Pela, Newcastle upon Tyne, Tyne and Wear, UK';
const contactEmail = 'hello@bloombypela.com';
const contactPhone = '07900 000000';

export const SEED_CONTENT: SeedContentPage[] = [
  {
    id: 'faqs',
    title: 'Frequently Asked Questions',
    description:
      'Answers about ordering, Newcastle delivery, collection and weekly juice subscriptions.',
    published: true,
    placeholder: false,
    bodyHtml: `
<h2>Ordering</h2>
<p>Browse the shop, add items to your basket and pay securely at checkout. We accept major debit and credit cards. You will receive an order confirmation by email once your payment is authorised.</p>

<h2>Delivery</h2>
<p>We deliver to Newcastle upon Tyne postcodes (NE districts). Delivery days and cut-off times are shown at checkout and on our delivery information page. Delivery is free on orders over £30.</p>

<h2>Collection</h2>
<p>Collection is available from our Newcastle premises when selected at checkout. You will receive collection details and opening hours in your order confirmation.</p>

<h2>Subscriptions</h2>
<p>Weekly juice subscriptions renew automatically until you pause or cancel them. You can manage your subscription in your account or through the Stripe customer portal. Billing takes place weekly; cut-off for changes is Monday 12:00 PM London time for that week&rsquo;s Friday delivery.</p>

<h2>Allergens</h2>
<p>Every product page lists the 14 major UK allergens that apply to that item. Our kitchen handles allergens including celery, cereals containing gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, peanuts, sesame, soybeans, sulphur dioxide and sulphites, and tree nuts. While we take care to avoid cross-contact, we cannot guarantee any product is allergen-free.</p>

<h2>Returns</h2>
<p>Because our juices are fresh and perishable, returns are accepted within 24 hours of delivery or collection where you report a fault with the item. Contact us as soon as possible at ${contactEmail} with your order number and a photo of the issue.</p>
`.trim(),
  },
  {
    id: 'terms',
    title: 'Terms and Conditions',
    description:
      'The terms that apply when you order snacks or cold-pressed juices from Bloom by Pela.',
    published: true,
    placeholder: false,
    bodyHtml: `
<h2>1. About us</h2>
<p>These terms apply to all orders placed through bloom-bypela.com. Bloom by Pela is based in Newcastle upon Tyne, UK. Contact us at ${contactEmail} or ${contactPhone}.</p>

<h2>2. Orders and pricing</h2>
<p>All prices are shown in pounds sterling (GBP) and include VAT where applicable. Prices are correct at the time of ordering but may change; the price you pay is the price shown at checkout. Your order is accepted when we send you an order confirmation email.</p>

<h2>3. Payment</h2>
<p>Payment is taken by card through our secure payment provider. We do not store your card details. Orders are not fulfilled until payment has been authorised.</p>

<h2>4. Delivery</h2>
<p>We deliver to Newcastle upon Tyne postcodes only. Delivery days, cut-off times, fees and minimum spend are shown at checkout and on our delivery information page. Delivery is free on orders over £30. Please ensure someone is available to receive and refrigerate perishable items immediately on delivery.</p>

<h2>5. Collection</h2>
<p>Where collection is available, you may collect your order from our Newcastle premises at the time and date selected at checkout. Collection details are sent with your order confirmation.</p>

<h2>6. Perishable goods and returns</h2>
<p>Our cold-pressed juices are fresh, raw and unpasteurised. They must be refrigerated below 4&deg;C and consumed within five days of delivery. Because of their perishable nature, we cannot accept returns unless you report a fault with the item within 24 hours of delivery or collection. If you receive a damaged or incorrect item, contact us at ${contactEmail} with your order number and a photograph. Where a return is accepted, we will offer a replacement or refund at our discretion.</p>

<h2>7. Subscriptions</h2>
<p>Weekly juice subscriptions are billed automatically on a recurring basis. You may pause, skip or cancel your subscription at any time through your account or the Stripe customer portal. Changes must be confirmed by Monday 12:00 PM London time to take effect for that week&rsquo;s Friday delivery.</p>

<h2>8. Allergens</h2>
<p>Our kitchen handles the 14 major UK allergens. Product pages list allergens per item, but we cannot guarantee any product is free from cross-contact. If you have a severe allergy, please contact us before ordering.</p>

<h2>9. Liability</h2>
<p>To the fullest extent permitted by law, our liability for any claim arising out of or in connection with these terms or your order is limited to the total amount you paid for the affected order. Nothing in these terms excludes or limits liability for death or personal injury caused by our negligence, or for fraud or fraudulent misrepresentation.</p>

<h2>10. Complaints</h2>
<p>If you have a complaint, please contact us at ${contactEmail}. We will aim to respond within two working days. If we cannot resolve your complaint, you may be able to refer it to an alternative dispute resolution provider.</p>

<h2>11. Governing law</h2>
<p>These terms are governed by the laws of England and Wales, and the courts of England and Wales have non-exclusive jurisdiction over any dispute.</p>
`.trim(),
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description:
      'How Bloom by Pela collects, uses and protects your personal data under the UK GDPR.',
    published: true,
    placeholder: false,
    bodyHtml: `
<h2>1. Who we are</h2>
<p>Bloom by Pela (&ldquo;we&rdquo;) is based in Newcastle upon Tyne, UK. We are the data controller for personal data collected through this website. Contact us at ${contactEmail} with any data protection questions.</p>

<h2>2. What we collect</h2>
<p>We collect the personal data necessary to take payment and deliver your order: your name, email address, telephone number, delivery address and order history. We also collect your account preferences and marketing consent where you give it.</p>

<h2>3. Payment data</h2>
<p>Card details are handled by our payment provider and are never stored by us or on our servers.</p>

<h2>4. Why we use your data</h2>
<p>We process your data to fulfil and deliver your orders, manage your account and subscriptions, meet accounting and food-safety obligations, send you order and delivery updates, and (only where you consent) tell you about new products and offers. Our lawful bases are contract performance, legal obligation, legitimate interests and your consent.</p>

<h2>5. Who we share data with</h2>
<p>We share only the data strictly necessary with our payment provider for card processing, and with delivery or collection services where applicable to complete your order. We do not sell your personal data.</p>

<h2>6. How long we keep it</h2>
<p>We keep order and account data for as long as needed to fulfil orders, comply with tax and food-safety record-keeping rules, and handle any complaints or returns. Marketing data is kept only while you remain subscribed to our communications.</p>

<h2>7. Your rights</h2>
<p>Under the UK GDPR you can request access to, correction of, or deletion of your personal data, restrict or object to our processing, and receive a copy of your data in a portable format. You may withdraw consent to marketing at any time. Exercise these rights in your account page or by emailing us at ${contactEmail}.</p>

<h2>8. Cookies</h2>
<p>Essential cookies keep your basket and sign-in working. Optional analytics cookies help us understand how the site is used and are set only after you accept them. You can change your cookie choices at any time from the footer.</p>

<h2>9. Security</h2>
<p>We use appropriate technical and organisational measures to protect your personal data against unauthorised access, loss or alteration.</p>

<h2>10. Contact us</h2>
<p>Email ${contactEmail} or write to us at ${businessAddress}.</p>
`.trim(),
  },
  {
    id: 'subscription-terms',
    title: 'Subscription Terms',
    description: 'How weekly juice subscriptions are billed, paused and cancelled.',
    published: true,
    placeholder: false,
    bodyHtml: `
<h2>1. About this subscription</h2>
<p>Bloom by Pela weekly juice subscriptions deliver fresh cold-pressed juices to your Newcastle doorstep every Friday. You choose your pack size (Bloom 3 or Bloom 5) and your flavours each week.</p>

<h2>2. Billing</h2>
<p>Your subscription is billed weekly in pounds sterling (GBP) through Stripe. Payment is taken on the billing day shown at sign-up. Your card details are held by Stripe, not by us.</p>

<h2>3. Cut-off times</h2>
<p>All flavour changes, skips and pauses must be confirmed by Monday 12:00 PM London time for that week&rsquo;s Friday delivery. Changes made after the cut-off will apply from the following week.</p>

<h2>4. Pausing and skipping</h2>
<p>You may pause your subscription or skip an individual week at any time through your account or the Stripe customer portal, provided you do so before the Monday cut-off.</p>

<h2>5. Cancelling</h2>
<p>You may cancel your subscription at any time. Cancellation takes effect from the next billing cycle; we do not provide refunds for already-billed weeks, but you will continue to receive deliveries already paid for.</p>

<h2>6. Delivery</h2>
<p>Juice subscriptions are delivered every Friday to Newcastle upon Tyne postcodes. Please ensure someone is available to receive and refrigerate your bottles immediately. Store below 4&deg;C and consume within five days.</p>

<h2>7. Problems</h2>
<p>If a delivery is late, missing or damaged, contact us at ${contactEmail} within 24 hours with your order number. Because juices are perishable, we can only offer a replacement or refund where a fault is reported within that period.</p>
`.trim(),
  },
  {
    id: 'returns',
    title: 'Delivery and Returns Policy',
    description: 'Delivery coverage, fees and what to do if something is wrong with your order.',
    published: true,
    placeholder: false,
    bodyHtml: `
<h2>Delivery areas</h2>
<p>We deliver to Newcastle upon Tyne postcodes (NE districts). Delivery areas, fees and minimum spend are listed on our delivery information page and are read live from our current settings.</p>

<h2>Delivery days and cut-off</h2>
<p>Fresh juice deliveries run on Fridays. Orders for Friday delivery must be placed by Monday 12:00 PM London time. Packaged snack orders follow the delivery dates shown at checkout.</p>

<h2>Delivery fees and free delivery</h2>
<p>Delivery fees depend on your postcode area and are shown at checkout. Delivery is free on orders over £30.</p>

<h2>Collection</h2>
<p>Where available, you may collect your order from our Newcastle premises. Collection details and opening hours are sent with your order confirmation.</p>

<h2>Perishable goods</h2>
<p>Our cold-pressed juices are raw, fresh and unpasteurised. Refrigerate below 4&deg;C immediately on receipt and consume within five days.</p>

<h2>Bloom by Pela &ndash; Returns, Refunds &amp; Exchange Policy</h2>
<p>At Bloom by Pela, we are committed to providing fresh, quality products prepared and packaged with care.</p>

<p>Due to the nature of our products, particularly freshly prepared juices, drinks, snacks and other edible goods, we operate the following returns and refunds policy.</p>

<h3>1. Change-of-mind returns</h3>
<p>For food safety and hygiene reasons, we do not accept change-of-mind returns on freshly prepared, perishable or opened food and drink products.</p>
<p>Products that are liable to deteriorate or expire rapidly are exempt from the statutory 14-day cancellation right under applicable UK consumer regulations.</p>

<h3>2. Damaged, incorrect or unsatisfactory products</h3>
<p>If you receive a damaged, incorrect, spoiled or faulty product, please contact us as soon as possible.</p>
<p>We may offer an appropriate refund, replacement or other remedy in accordance with your statutory consumer rights.</p>

<h3>3. Reporting a problem</h3>
<p>Customers should contact us within 24 hours of receiving their order where possible, providing:</p>
<ul>
  <li>their order number;</li>
  <li>a description of the problem;</li>
  <li>clear photographs or videos where applicable.</li>
</ul>
<p>This helps us investigate and resolve complaints promptly. This reporting period does not limit your statutory consumer rights.</p>

<h3>4. Food safety and hygiene</h3>
<p>For health and safety reasons, opened food and drink products cannot be returned for resale.</p>
<p>Customers are advised to follow the storage instructions and consume products within the recommended period stated on the packaging.</p>

<h3>5. Refund processing</h3>
<p>Where a refund is approved, it will be processed using the original payment method wherever practicable and in accordance with applicable consumer law.</p>

<h2>Our commitment</h2>
<p>Your satisfaction and safety matter to us. We take every product-quality concern seriously and aim to resolve genuine complaints fairly and promptly.</p>
<p>Bloom by Pela &ndash; Nourish. Naturally.</p>
`.trim(),
  },
];
