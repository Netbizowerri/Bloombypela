// PLACEHOLDER: Seed catalogue content. Replace with real subscription plans before launch.
import type { SubscriptionPlan } from '../../types/products.js';

export const SEED_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'sub-weekly-bloom-3',
    name: 'Weekly Bloom 3',
    bottleCount: 3,
    pricePence: 1250, // £12.50 / week
    frequency: 'weekly',
    description: '3 bespoke 330ml cold-pressed juices delivered fresh every Thursday to your doorstep in Newcastle.',
    features: [
      'Choose your 3 favourite flavours each week',
      'Free Thursday local delivery included',
      'Skip or pause anytime before Monday 12:00 cut-off',
      'Guaranteed juice capacity reservation',
    ],
    isPopular: false,
  },
  {
    id: 'sub-weekly-bloom-5',
    name: 'Weekly Bloom 5 (Full Workweek)',
    bottleCount: 5,
    pricePence: 1950, // £19.50 / week (Save £3.00)
    frequency: 'weekly',
    description: '5 cold-pressed wellness juices for everyday nourishing vitality throughout your work week.',
    features: [
      '5 bottles of your choice per week',
      'Free Thursday Newcastle delivery',
      '1 complimentary Ginger Wellness Shot with every delivery',
      'Pause or cancel anytime in 2 clicks',
    ],
    isPopular: true,
  },
];
