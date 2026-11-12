// Seed delivery settings. The legacy threshold field controls delivery
// progress copy; fixed shipping rates are enforced in shipping logic.
import type { PublicSettings } from '../../types/delivery.js';

export const SEED_PUBLIC_SETTINGS: PublicSettings = {
  freeDeliveryThresholdPence: 3000,
  snackFlatFeePence: 399,
  collectionEnabled: true,
  // PLACEHOLDER: replace with the real collection address before launch.
  collectionDetails: 'Click & collect at our shop, Newcastle upon Tyne',
};
