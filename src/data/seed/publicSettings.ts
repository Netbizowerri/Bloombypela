// Seed delivery settings. Shipping is charged by item type: snack-only orders
// use snackFlatFeePence, while any cart containing fresh juices uses the
// delivery area's feePence (set to £5.99 for every area).
import type { PublicSettings } from '../../types/delivery.js';

export const SEED_PUBLIC_SETTINGS: PublicSettings = {
  freeDeliveryThresholdPence: 3000,
  snackFlatFeePence: 399,
  collectionEnabled: true,
  // PLACEHOLDER: replace with the real collection address before launch.
  collectionDetails: 'Click & collect at our shop, Newcastle upon Tyne',
};
