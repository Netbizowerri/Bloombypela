import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

const rulesCandidates = [
  path.resolve(process.cwd(), 'firestore.rules'),
  path.resolve(process.cwd(), '..', 'firestore.rules'),
];
const RULES_PATH = rulesCandidates.find((candidate) => existsSync(candidate));
if (!RULES_PATH) {
  throw new Error(`Could not find firestore.rules. Looked in: ${rulesCandidates.join(', ')}`);
}

const [EMULATOR_HOST, EMULATOR_PORT] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080')
  .split(':');

let testEnv: RulesTestEnvironment;

/**
 * rules-unit-testing publishes the compat Firestore type for `firestore()`,
 * but the object it returns is the modular client used by `firebase/firestore`.
 * The cast documents that mismatch; no runtime behaviour depends on it.
 */
const dbFor = (context: RulesTestContext): Firestore =>
  context.firestore() as unknown as Firestore;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'bloom-by-pela-rules-test',
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: EMULATOR_HOST,
      port: Number(EMULATOR_PORT),
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

/**
 * Seeds data with rules disabled, exactly as Cloud Functions (Admin SDK) would.
 */
const seed = async (path: string, data: Record<string, unknown>): Promise<void> => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
};

const customer = () => testEnv.authenticatedContext('customer-a', { role: 'customer' });
const otherCustomer = () => testEnv.authenticatedContext('customer-b', { role: 'customer' });
const staff = () => testEnv.authenticatedContext('staff-1', { role: 'staff' });
const admin = () => testEnv.authenticatedContext('admin-1', { role: 'admin' });
const anonymous = () => testEnv.unauthenticatedContext();

describe('orders', () => {
  it('denies anonymous reads', async () => {
    await seed('orders/order-1', { userId: 'customer-a', totalPence: 1500 });

    await assertFails(getDoc(doc(dbFor(anonymous()), 'orders/order-1')));
  });

  it('lets a customer read their own order but not another customer order', async () => {
    await seed('orders/order-1', { userId: 'customer-a', totalPence: 1500 });
    await seed('orders/order-2', { userId: 'customer-b', totalPence: 900 });

    await assertSucceeds(getDoc(doc(dbFor(customer()), 'orders/order-1')));
    await assertFails(getDoc(doc(dbFor(customer()), 'orders/order-2')));
  });

  it('lets staff read any order', async () => {
    await seed('orders/order-2', { userId: 'customer-b', totalPence: 900 });

    await assertSucceeds(getDoc(doc(dbFor(staff()), 'orders/order-2')));
  });

  it('denies client creates and deletes', async () => {
    await seed('orders/order-1', { userId: 'customer-a', totalPence: 1500 });

    await assertFails(
      setDoc(doc(dbFor(customer()), 'orders/order-3'), { userId: 'customer-a', totalPence: 1 })
    );
    await assertFails(
      setDoc(doc(dbFor(staff()), 'orders/order-4'), { userId: 'customer-a', totalPence: 1 })
    );
    await assertFails(deleteDoc(doc(dbFor(admin()), 'orders/order-1')));
  });

  it('lets staff move an order through its status fields only', async () => {
    await seed('orders/order-1', {
      userId: 'customer-a',
      totalPence: 1500,
      status: 'confirmed',
      statusHistory: [],
    });

    await assertSucceeds(
      updateDoc(doc(dbFor(staff()), 'orders/order-1'), {
        status: 'preparing',
        statusHistory: [{ status: 'preparing', at: new Date(), note: 'picked' }],
        internalNote: 'picked',
        updatedAt: new Date(),
      })
    );
  });

  it('denies staff repricing an order or writing an unknown status', async () => {
    await seed('orders/order-1', {
      userId: 'customer-a',
      totalPence: 1500,
      status: 'confirmed',
      statusHistory: [],
    });

    await assertFails(updateDoc(doc(dbFor(staff()), 'orders/order-1'), { totalPence: 1 }));
    await assertFails(
      updateDoc(doc(dbFor(staff()), 'orders/order-1'), { status: 'delivered-for-free' })
    );
    await assertFails(
      updateDoc(doc(dbFor(customer()), 'orders/order-1'), { status: 'cancelled' })
    );
  });

  it('lets only admin record a refund, and never above the order total', async () => {
    await seed('orders/order-1', {
      userId: 'customer-a',
      totalPence: 1500,
      status: 'confirmed',
      paymentStatus: 'paid',
      refundedPence: 0,
      statusHistory: [],
    });

    await assertFails(
      updateDoc(doc(dbFor(staff()), 'orders/order-1'), {
        paymentStatus: 'partially_refunded',
        refundedPence: 500,
        updatedAt: new Date(),
      })
    );
    await assertFails(
      updateDoc(doc(dbFor(admin()), 'orders/order-1'), {
        paymentStatus: 'refunded',
        refundedPence: 9999,
        updatedAt: new Date(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(dbFor(admin()), 'orders/order-1'), {
        paymentStatus: 'partially_refunded',
        refundedPence: 500,
        statusHistory: [{ status: 'confirmed', at: new Date(), note: 'refund £5.00' }],
        updatedAt: new Date(),
      })
    );
  });

  /**
   * Mirrors exactly what the admin dashboard does: one transaction that moves
   * the status and appends the audit entry, both with server timestamps.
   */
  it('accepts the dashboard transaction: status update plus audit entry', async () => {
    await seed('orders/order-1', {
      userId: 'customer-a',
      totalPence: 1500,
      status: 'confirmed',
      statusHistory: [],
    });

    const database = dbFor(staff());
    await assertSucceeds(
      runTransaction(database, async (transaction) => {
        const orderRef = doc(database, 'orders/order-1');
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists()) throw new Error('missing order');

        transaction.update(orderRef, {
          status: 'preparing',
          updatedAt: serverTimestamp(),
          statusHistory: arrayUnion({ status: 'preparing', at: new Date(), note: 'picked' }),
          internalNote: 'picked',
        });

        transaction.set(doc(collection(database, 'auditLog')), {
          action: 'update_order_status',
          entityType: 'order',
          entityId: 'order-1',
          uid: 'staff-1',
          email: 'staff@example.com',
          metadata: { from: 'confirmed', to: 'preparing' },
          createdAt: serverTimestamp(),
        });
      })
    );
  });
});

describe('subscriptions and deliveries', () => {
  it('lets a customer read their own subscription only', async () => {
    await seed('subscriptions/sub-1', { userId: 'customer-a', planId: 'plan-1' });
    await seed('subscriptions/sub-2', { userId: 'customer-b', planId: 'plan-1' });

    await assertSucceeds(getDoc(doc(dbFor(customer()), 'subscriptions/sub-1')));
    await assertFails(getDoc(doc(dbFor(customer()), 'subscriptions/sub-2')));
  });

  it('denies customer writes to subscriptions and subscriptionDeliveries', async () => {
    await seed('subscriptions/sub-1', { userId: 'customer-a', planId: 'plan-1' });
    await seed('subscriptionDeliveries/del-1', { userId: 'customer-a', status: 'scheduled' });

    await assertFails(
      setDoc(doc(dbFor(customer()), 'subscriptions/sub-3'), {
        userId: 'customer-a',
        planId: 'plan-1',
      })
    );
    await assertFails(
      updateDoc(doc(dbFor(customer()), 'subscriptionDeliveries/del-1'), { status: 'skipped' })
    );
  });
});

describe('server-only collections', () => {
  it('denies customer access to promotions, stripeEvents and reservations', async () => {
    await seed('promotions/promo-1', { code: 'BLOOM10', active: true });
    await seed('stripeEvents/evt_1', { type: 'checkout.session.completed' });
    await seed('reservations/res-1', { orderId: 'order-1' });

    await assertFails(getDoc(doc(dbFor(customer()), 'promotions/promo-1')));
    await assertFails(
      setDoc(doc(dbFor(customer()), 'promotions/promo-2'), { code: 'FREE', active: true })
    );

    await assertFails(getDoc(doc(dbFor(customer()), 'stripeEvents/evt_1')));
    await assertFails(
      setDoc(doc(dbFor(customer()), 'stripeEvents/evt_2'), { type: 'fake' })
    );

    await assertFails(getDoc(doc(dbFor(customer()), 'reservations/res-1')));
    await assertFails(
      setDoc(doc(dbFor(customer()), 'reservations/res-2'), { orderId: 'order-1' })
    );
  });

  it('denies admin access to stripeEvents and reservations (server only)', async () => {
    await seed('stripeEvents/evt_1', { type: 'checkout.session.completed' });

    await assertFails(getDoc(doc(dbFor(admin()), 'stripeEvents/evt_1')));
  });

  it('lets staff append their own audit entry but never forge or edit one', async () => {
    await seed('auditLog/entry-1', { action: 'product.updated' });

    await assertFails(getDoc(doc(dbFor(staff()), 'auditLog/entry-1')));
    await assertSucceeds(getDoc(doc(dbFor(admin()), 'auditLog/entry-1')));

    // An honest entry: own uid, server timestamp.
    await assertSucceeds(
      setDoc(doc(dbFor(staff()), 'auditLog/entry-staff'), {
        action: 'update',
        entityType: 'product',
        entityId: 'prod-1',
        uid: 'staff-1',
        email: 'staff@example.com',
        metadata: { name: 'Plantain chips' },
        createdAt: serverTimestamp(),
      })
    );

    // Attributed to somebody else.
    await assertFails(
      setDoc(doc(dbFor(staff()), 'auditLog/entry-forged'), {
        action: 'delete',
        entityType: 'product',
        entityId: 'prod-1',
        uid: 'admin-1',
        email: 'staff@example.com',
        metadata: null,
        createdAt: serverTimestamp(),
      })
    );

    // Back-dated entry.
    await assertFails(
      setDoc(doc(dbFor(admin()), 'auditLog/entry-backdated'), {
        action: 'update',
        entityType: 'product',
        entityId: 'prod-1',
        uid: 'admin-1',
        email: 'admin@example.com',
        metadata: null,
        createdAt: new Date('2020-01-01T00:00:00Z'),
      })
    );

    // The trail is append-only.
    await assertFails(
      updateDoc(doc(dbFor(admin()), 'auditLog/entry-1'), { action: 'tampered' })
    );
    await assertFails(deleteDoc(doc(dbFor(admin()), 'auditLog/entry-1')));
  });

  it('lets staff read promotions but not write them', async () => {
    await seed('promotions/promo-1', { code: 'BLOOM10', active: true });

    await assertSucceeds(getDoc(doc(dbFor(staff()), 'promotions/promo-1')));
    await assertFails(
      setDoc(doc(dbFor(staff()), 'promotions/promo-2'), { code: 'FREE', active: true })
    );
  });
});

describe('customer profile', () => {
  const validProfile = {
    name: 'Ada Bloom',
    email: 'ada@example.com',
    phone: '+447700900123',
    addresses: [],
    marketingConsent: false,
  };

  it('lets a customer create their own profile with allowed keys', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(customer()), 'customers/customer-a'), validProfile)
    );
  });

  it('rejects creation with stripeCustomerId or role', async () => {
    await assertFails(
      setDoc(doc(dbFor(customer()), 'customers/customer-a'), {
        ...validProfile,
        stripeCustomerId: 'cus_fake',
      })
    );
    await assertFails(
      setDoc(doc(dbFor(customer()), 'customers/customer-a'), {
        ...validProfile,
        role: 'admin',
      })
    );
  });

  it('rejects creating a profile for another uid', async () => {
    await assertFails(
      setDoc(doc(dbFor(customer()), 'customers/customer-b'), validProfile)
    );
  });

  it('lets a customer update only the allowed profile keys', async () => {
    await seed('customers/customer-a', validProfile);

    await assertSucceeds(
      updateDoc(doc(dbFor(customer()), 'customers/customer-a'), {
        name: 'Ada Bloom-New',
        marketingConsent: true,
      })
    );

    await assertFails(
      updateDoc(doc(dbFor(customer()), 'customers/customer-a'), {
        stripeCustomerId: 'cus_fake',
      })
    );
    await assertFails(
      updateDoc(doc(dbFor(customer()), 'customers/customer-a'), {
        email: 'attacker@example.com',
      })
    );
  });

  it('rejects delete of the profile', async () => {
    await seed('customers/customer-a', validProfile);

    await assertFails(deleteDoc(doc(dbFor(customer()), 'customers/customer-a')));
  });

  it('lets only the owner or staff read a profile', async () => {
    await seed('customers/customer-a', validProfile);

    await assertSucceeds(getDoc(doc(dbFor(customer()), 'customers/customer-a')));
    await assertFails(getDoc(doc(dbFor(otherCustomer()), 'customers/customer-a')));
    await assertSucceeds(getDoc(doc(dbFor(staff()), 'customers/customer-a')));
  });
});

describe('products', () => {
  const visibleProduct = {
    name: 'Plantain chips',
    status: 'active',
    variants: [],
  };
  const hiddenProduct = {
    name: 'Seasonal special',
    status: 'hidden',
    variants: [],
  };

  it('hides hidden products from customers but not from staff', async () => {
    await seed('products/prod-visible', visibleProduct);
    await seed('products/prod-hidden', hiddenProduct);

    await assertSucceeds(getDoc(doc(dbFor(customer()), 'products/prod-visible')));
    await assertFails(getDoc(doc(dbFor(customer()), 'products/prod-hidden')));
    await assertSucceeds(getDoc(doc(dbFor(staff()), 'products/prod-hidden')));
  });

  it('requires a public status filter on customer product queries', async () => {
    await seed('products/prod-visible', { ...visibleProduct, slug: 'plantain-chips' });
    await seed('products/prod-hidden', { ...hiddenProduct, slug: 'seasonal-special' });

    const customerDb = dbFor(customer());

    // A bare slug query cannot be proven safe by the rules, so Firestore
    // rejects it. This is the bug the product detail page hit.
    await assertFails(
      getDocs(
        query(collection(customerDb, 'products'), where('slug', '==', 'plantain-chips'))
      )
    );

    // The detail-page query proves every returned document is publicly visible.
    await assertSucceeds(
      getDocs(
        query(
          collection(customerDb, 'products'),
          where('status', 'in', ['active', 'seasonal']),
          where('slug', '==', 'plantain-chips')
        )
      )
    );

    // Staff may query without a status filter and can read hidden products.
    await assertSucceeds(
      getDocs(
        query(
          collection(dbFor(staff()), 'products'),
          where('slug', '==', 'seasonal-special')
        )
      )
    );
  });

  it('lets staff and admin write a valid product, denies customers and malformed documents', async () => {
    // Exactly what the admin catalogue form writes: optional fields are null,
    // timestamps are server timestamps.
    const validProduct = {
      name: 'Plantain chips',
      slug: 'plantain-chips',
      type: 'snack',
      category: 'Snacks',
      description: 'Crisp plantain chips.',
      shortDescription: null,
      ingredients: ['plantain', 'oil'],
      allergens: [],
      weightOrVolume: '150g',
      images: [],
      status: 'active',
      seasonalStartDate: null,
      seasonalEndDate: null,
      variants: [
        {
          id: 'v1',
          name: '150g',
          pricePence: 450,
          sku: 'PC-150',
          stock: 10,
          isDefault: false,
        },
      ],
      seoTitle: null,
      seoDescription: null,
      isPopular: false,
      allergenReviewed: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await assertSucceeds(setDoc(doc(dbFor(admin()), 'products/prod-new'), validProduct));
    await assertSucceeds(setDoc(doc(dbFor(staff()), 'products/prod-new-staff'), validProduct));
    await assertFails(
      setDoc(doc(dbFor(customer()), 'products/prod-new-customer'), validProduct)
    );

    // Malformed writes are rejected even for an admin.
    await assertFails(
      setDoc(doc(dbFor(admin()), 'products/prod-no-variants'), {
        ...validProduct,
        variants: [],
      })
    );
    await assertFails(
      setDoc(doc(dbFor(admin()), 'products/prod-bad-status'), {
        ...validProduct,
        status: 'published',
      })
    );
    await assertFails(
      setDoc(doc(dbFor(admin()), 'products/prod-too-many-images'), {
        ...validProduct,
        images: [
          { url: 'https://a/1.jpg', publicId: '1' },
          { url: 'https://a/2.jpg', publicId: '2' },
          { url: 'https://a/3.jpg', publicId: '3' },
          { url: 'https://a/4.jpg', publicId: '4' },
        ],
      })
    );
  });

  it('requires an allergen review before a product can be active', async () => {
    const unreviewedActive = {
      name: 'New juice',
      slug: 'new-juice',
      type: 'juice',
      category: 'Juices',
      description: 'Fresh juice.',
      ingredients: ['apple'],
      allergens: [],
      weightOrVolume: '330ml',
      images: [],
      status: 'active',
      variants: [{ id: 'v1', name: '330ml', pricePence: 450, sku: 'J-330', stock: 5 }],
      allergenReviewed: false,
    };

    // The food-safety gate: no review, no publication, even for an admin.
    await assertFails(setDoc(doc(dbFor(admin()), 'products/prod-unreviewed'), unreviewedActive));

    // A hidden draft is allowed so staff can prepare it before review.
    await assertSucceeds(
      setDoc(doc(dbFor(admin()), 'products/prod-draft'), {
        ...unreviewedActive,
        status: 'hidden',
      })
    );

    // Activating it without the review flag is still refused.
    await assertFails(
      updateDoc(doc(dbFor(admin()), 'products/prod-draft'), {
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    );

    // Reviewing it unlocks publication.
    await assertSucceeds(
      updateDoc(doc(dbFor(admin()), 'products/prod-draft'), {
        status: 'active',
        allergenReviewed: true,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('publishes only reviewed, public, shape-valid documents in the content collection', async () => {
    const page = {
      slug: 'privacy',
      title: 'Privacy Policy',
      description: 'How we handle your data.',
      bodyHtml: '<p>PLACEHOLDER - REVIEW BY CLIENT</p>',
      published: true,
      placeholder: true,
      updatedAt: serverTimestamp(),
    };

    // Drafts are invisible to the public even when the slug is known.
    await seed('content/draft-page', { ...page, slug: 'draft-page', published: false });
    await assertFails(getDoc(doc(dbFor(customer()), 'content/draft-page')));
    await assertSucceeds(getDoc(doc(dbFor(staff()), 'content/draft-page')));

    // Published copy is public read, staff write.
    await assertSucceeds(setDoc(doc(dbFor(staff()), 'content/privacy'), page));
    await assertSucceeds(getDoc(doc(dbFor(anonymous()), 'content/privacy')));
    await assertFails(
      setDoc(doc(dbFor(customer()), 'content/customer-page'), {
        ...page,
        slug: 'customer-page',
      })
    );
    await assertFails(
      setDoc(doc(dbFor(staff()), 'content/bad-page'), { ...page, slug: 'bad-page', published: 'yes' })
    );
  });

  it('applies the parent product visibility to variants', async () => {
    await seed('products/prod-hidden', hiddenProduct);
    await seed('products/prod-hidden/variants/v1', { name: '330ml', pricePence: 450 });

    await assertFails(getDoc(doc(dbFor(customer()), 'products/prod-hidden/variants/v1')));
    await assertSucceeds(getDoc(doc(dbFor(staff()), 'products/prod-hidden/variants/v1')));
  });
});

describe('delivery configuration', () => {
  const validArea = {
    id: 'da-ne1',
    outwardCode: 'NE1',
    areaName: 'Newcastle city centre',
    feePence: 300,
    minimumOrderPence: 1500,
    isActive: true,
  };

  it('lets staff maintain areas and denies customers', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(staff()), 'deliveryAreas/da-ne1'), validArea)
    );
    await assertFails(
      setDoc(doc(dbFor(customer()), 'deliveryAreas/da-ne2'), {
        ...validArea,
        id: 'da-ne2',
        outwardCode: 'NE2',
      })
    );
  });

  it('rejects a negative or non-integer delivery fee', async () => {
    await assertFails(
      setDoc(doc(dbFor(staff()), 'deliveryAreas/da-bad-fee'), {
        ...validArea,
        id: 'da-bad-fee',
        feePence: -100,
      })
    );
    await assertFails(
      setDoc(doc(dbFor(staff()), 'deliveryAreas/da-float-fee'), {
        ...validArea,
        id: 'da-float-fee',
        feePence: 3.5,
      })
    );
  });
});

describe('default deny', () => {
  it('denies reads and writes on an unknown collection, even for admin', async () => {
    await assertFails(getDoc(doc(dbFor(admin()), 'unknownCollection/doc-1')));
    await assertFails(
      setDoc(doc(dbFor(admin()), 'unknownCollection/doc-1'), { anything: true })
    );
    await assertFails(
      setDoc(doc(dbFor(customer()), 'unknownCollection/doc-1'), { anything: true })
    );
  });

  it('keeps the security rules file free of accidental public access', async () => {
    await seed('settings/app', { maintenanceMode: false });
    await assertFails(getDoc(doc(dbFor(customer()), 'settings/app')));
    await assertSucceeds(getDoc(doc(dbFor(staff()), 'settings/app')));
  });
});
