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
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
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

  it('denies every client write, including the owner', async () => {
    await seed('orders/order-1', { userId: 'customer-a', totalPence: 1500 });

    await assertFails(
      setDoc(doc(dbFor(customer()), 'orders/order-3'), { userId: 'customer-a', totalPence: 1 })
    );
    await assertFails(
      updateDoc(doc(dbFor(customer()), 'orders/order-1'), { totalPence: 1 })
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

  it('lets only admin read the audit log', async () => {
    await seed('auditLog/entry-1', { action: 'product.updated' });

    await assertFails(getDoc(doc(dbFor(staff()), 'auditLog/entry-1')));
    await assertSucceeds(getDoc(doc(dbFor(admin()), 'auditLog/entry-1')));
    await assertFails(
      setDoc(doc(dbFor(admin()), 'auditLog/entry-2'), { action: 'forged.entry' })
    );
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

  it('lets admin write products and denies staff writes', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(admin()), 'products/prod-new'), visibleProduct)
    );
    await assertFails(
      setDoc(doc(dbFor(staff()), 'products/prod-new-staff'), visibleProduct)
    );
    await assertFails(
      setDoc(doc(dbFor(customer()), 'products/prod-new-customer'), visibleProduct)
    );
  });

  it('applies the parent product visibility to variants', async () => {
    await seed('products/prod-hidden', hiddenProduct);
    await seed('products/prod-hidden/variants/v1', { name: '330ml', pricePence: 450 });

    await assertFails(getDoc(doc(dbFor(customer()), 'products/prod-hidden/variants/v1')));
    await assertSucceeds(getDoc(doc(dbFor(staff()), 'products/prod-hidden/variants/v1')));
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
