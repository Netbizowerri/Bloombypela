import { Product, SubscriptionPlan, ProductBundle } from '../types/products';
import { DeliveryArea } from '../types/cart';

export const INITIAL_PRODUCTS: Product[] = [
  // SNACKS (Life in Every Bite) - Sourced from Nigeria
  {
    id: 'prod-snack-plantain-chips',
    name: 'Artisan Plantain Chips',
    slug: 'artisan-plantain-chips',
    type: 'snack',
    category: 'Packaged Snacks',
    origin: 'Nigeria',
    weightOrVolume: '150g',
    description:
      'Crispy, golden-sliced plantain kettle-cooked to perfection. Sourced directly from trusted Nigerian smallholders, naturally sweet and lightly seasoned with sea salt.',
    shortDescription: 'Golden, crispy kettle-cooked Nigerian plantains with sea salt.',
    ingredients: ['Selected Green Plantains', 'Sustainable Sunflower Oil', 'Fine Sea Salt'],
    allergens: [],
    images: [
      'https://images.unsplash.com/photo-1621996346565-e3d5d62816dd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    isPopular: true,
    variants: [
      { id: 'var-pc-150', name: '150g Sharing Bag', pricePence: 350, sku: 'BBP-SNK-PC150', stock: 45, isDefault: true },
      { id: 'var-pc-300', name: '300g Party Pouch', pricePence: 650, sku: 'BBP-SNK-PC300', stock: 28 },
    ],
    seoTitle: 'Artisan Plantain Chips | Bloom by Pela Newcastle',
    seoDescription: 'Crispy Nigerian plantain chips kettle-cooked with sea salt. Handcrafted snacks in Newcastle upon Tyne.',
  },
  {
    id: 'prod-snack-coconut-chips',
    name: 'Toasted Coconut Chips',
    slug: 'toasted-coconut-chips',
    type: 'snack',
    category: 'Packaged Snacks',
    origin: 'Nigeria',
    weightOrVolume: '100g',
    description:
      'Fragrant, delicate strips of mature Nigerian coconut, slow-roasted with a kiss of organic cane sugar and a hint of warm vanilla.',
    shortDescription: 'Crisp, roasted coconut curls lightly glazed with cane sugar.',
    ingredients: ['Pure Coconut Flesh', 'Unrefined Cane Sugar', 'Natural Vanilla Extract', 'Sea Salt'],
    allergens: [],
    images: [
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    isPopular: true,
    variants: [
      { id: 'var-cc-100', name: '100g Resealable Pouch', pricePence: 320, sku: 'BBP-SNK-CC100', stock: 30, isDefault: true },
      { id: 'var-cc-250', name: '250g Jar', pricePence: 680, sku: 'BBP-SNK-CC250', stock: 15 },
    ],
  },
  {
    id: 'prod-snack-chin-chin',
    name: 'Heritage Chin Chin Bites',
    slug: 'heritage-chin-chin-bites',
    type: 'snack',
    category: 'Packaged Snacks',
    origin: 'Nigeria',
    weightOrVolume: '200g',
    description:
      'Traditional Nigerian sweet pastry bites spiced with fragrant grated nutmeg, pure butter, and Madagascar vanilla. Golden and dangerously crunchy.',
    shortDescription: 'Golden, sweet pastry cubes spiced with aromatic nutmeg and vanilla.',
    ingredients: ['Wheat Flour', 'Pure Butter', 'Sugar', 'Eggs', 'Whole Milk', 'Nutmeg', 'Baking Powder', 'Salt'],
    allergens: ['Cereals containing gluten', 'Eggs', 'Milk'],
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    variants: [
      { id: 'var-ch-200', name: '200g Tub', pricePence: 420, sku: 'BBP-SNK-CH200', stock: 24, isDefault: true },
      { id: 'var-ch-450', name: '450g Gifting Tub', pricePence: 850, sku: 'BBP-SNK-CH450', stock: 18 },
    ],
  },
  {
    id: 'prod-snack-groundnuts',
    name: 'Slow-Roasted Groundnuts',
    slug: 'slow-roasted-groundnuts',
    type: 'snack',
    category: 'Packaged Snacks',
    origin: 'Nigeria',
    weightOrVolume: '200g',
    description:
      'Classic West African sand-roasted peanuts with a deep nutty crunch and golden toastiness. A legendary accompaniment to drinks.',
    shortDescription: 'Traditional sand-roasted peanuts with rich nutty depth.',
    ingredients: ['Selected Peanuts (Groundnuts)', 'Fine Sea Salt'],
    allergens: ['Peanuts'],
    images: [
      'https://images.unsplash.com/photo-1567894340315-735d7c361db0?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    variants: [
      { id: 'var-gn-200', name: '200g Pouch', pricePence: 300, sku: 'BBP-SNK-GN200', stock: 40, isDefault: true },
    ],
  },
  {
    id: 'prod-snack-cashews',
    name: 'Hand-Selected Roasted Cashews',
    slug: 'hand-selected-roasted-cashews',
    type: 'snack',
    category: 'Packaged Snacks',
    origin: 'West Africa',
    weightOrVolume: '180g',
    description:
      'Whole jumbo cashew nuts dry-roasted with botanical Nigerian herbs and Atlantic sea salt.',
    shortDescription: 'Buttery, whole jumbo cashews toasted with coastal salt.',
    ingredients: ['Whole Cashew Nuts', 'Cold-Pressed Peanut Oil', 'Sea Salt'],
    allergens: ['Tree nuts', 'Peanuts'],
    images: [
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    variants: [
      { id: 'var-cw-180', name: '180g Pouch', pricePence: 480, sku: 'BBP-SNK-CW180', stock: 22, isDefault: true },
    ],
  },

  // FRESH JUICES (Life in Every Sip) - Prepared Fresh in UK
  {
    id: 'prod-juice-tropical-bloom',
    name: 'Tropical Bloom Juice',
    slug: 'tropical-bloom-juice',
    type: 'juice',
    category: 'Fresh Juices & Drinks',
    origin: 'UK Prepared',
    weightOrVolume: '330ml',
    description:
      'Our flagship sunshine elixir: cold-pressed ripe mango, sweet pineapples, passion fruit, fresh orange, and cold-extracted ginger. Pure liquid sunshine.',
    shortDescription: 'Cold-pressed mango, golden pineapple, passion fruit, and ginger.',
    ingredients: ['Mango Puree', 'Fresh Pineapple Juice', 'Passion Fruit', 'Fresh Orange', 'Raw Ginger Root'],
    allergens: [],
    images: [
      'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    isPopular: true,
    variants: [
      { id: 'var-tb-330', name: '330ml Glass Bottle', pricePence: 450, sku: 'BBP-JCE-TB330', stock: 50, isDefault: true },
      { id: 'var-tb-750', name: '750ml Sharing Carafe', pricePence: 850, sku: 'BBP-JCE-TB750', stock: 20 },
    ],
  },
  {
    id: 'prod-juice-skin-glow',
    name: 'Skin Glow Elixir',
    slug: 'skin-glow-elixir',
    type: 'juice',
    category: 'Fresh Juices & Drinks',
    origin: 'UK Prepared',
    weightOrVolume: '330ml',
    description:
      'A nutrient-dense radiance blend made with crisp English carrots, organic sweet orange, turmeric root, red apple, and cold-pressed lemon.',
    shortDescription: 'Carrot, fresh turmeric, crisp apple, orange, and lemon radiance booster.',
    ingredients: ['Organic Carrots', 'Red Apples', 'Fresh Orange', 'Raw Turmeric', 'Lemon Juice'],
    allergens: [],
    images: [
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    isPopular: true,
    variants: [
      { id: 'var-sg-330', name: '330ml Glass Bottle', pricePence: 450, sku: 'BBP-JCE-SG330', stock: 45, isDefault: true },
    ],
  },
  {
    id: 'prod-juice-detox-blend',
    name: 'Detox Green Juice Blend',
    slug: 'detox-green-juice-blend',
    type: 'juice',
    category: 'Fresh Juices & Drinks',
    origin: 'UK Prepared',
    weightOrVolume: '330ml',
    description:
      'Ultra-cleansing cold-pressed British cucumber, tender celery stalks, crisp green Granny Smith apples, spinach, and fresh mint.',
    shortDescription: 'Crisp cucumber, celery, spinach, green apple, and fresh garden mint.',
    ingredients: ['Cucumber', 'Celery', 'Green Apples', 'Spinach', 'Lime', 'Garden Mint'],
    allergens: ['Celery'],
    images: [
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    variants: [
      { id: 'var-dt-330', name: '330ml Glass Bottle', pricePence: 450, sku: 'BBP-JCE-DT330', stock: 40, isDefault: true },
    ],
  },
  {
    id: 'prod-juice-zobo',
    name: 'Artisan Zobo Hibiscus Tonic',
    slug: 'artisan-zobo-hibiscus-tonic',
    type: 'juice',
    category: 'Fresh Juices & Drinks',
    origin: 'UK Prepared',
    weightOrVolume: '330ml',
    description:
      'Slow-brewed Nigerian dried hibiscus calyces (Sorrel) infused with crushed cloves, fresh ginger, sweet pineapple rind, and cinnamon bark. Rich in antioxidants.',
    shortDescription: 'Slow-brewed red hibiscus with fiery ginger, cloves, and sweet pineapple.',
    ingredients: ['Nigerian Dried Hibiscus Flowers', 'Pineapple Rind Infusion', 'Ginger Root', 'Cloves', 'Cinnamon Stick'],
    allergens: [],
    images: [
      'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    isPopular: true,
    variants: [
      { id: 'var-zb-330', name: '330ml Glass Bottle', pricePence: 420, sku: 'BBP-JCE-ZB330', stock: 60, isDefault: true },
      { id: 'var-zb-750', name: '750ml Sharing Bottle', pricePence: 800, sku: 'BBP-JCE-ZB750', stock: 25 },
    ],
  },
  {
    id: 'prod-juice-ginger-shots',
    name: 'Fiery Ginger Wellness Shots',
    slug: 'fiery-ginger-wellness-shots',
    type: 'juice',
    category: 'Fresh Juices & Drinks',
    origin: 'UK Prepared',
    weightOrVolume: '60ml',
    description:
      'Intense, immune-boosting cold-pressed ginger root combined with organic Sicilian lemon and a pinch of cayenne pepper.',
    shortDescription: 'Potent 60ml shot of raw cold-pressed ginger, lemon, and cayenne pepper.',
    ingredients: ['Raw Ginger Juice (80%)', 'Fresh Lemon Juice', 'Cayenne Pepper'],
    allergens: [],
    images: [
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'active',
    variants: [
      { id: 'var-gs-single', name: 'Single 60ml Shot', pricePence: 250, sku: 'BBP-SHT-GS60', stock: 80, isDefault: true },
      { id: 'var-gs-pack6', name: 'Weekly 6-Pack (6 x 60ml)', pricePence: 1350, sku: 'BBP-SHT-GS6PK', stock: 35 },
    ],
  },
];

export const INITIAL_BUNDLES: ProductBundle[] = [
  {
    id: 'bundle-tasting-box',
    name: 'The Bloom Tasting Box',
    slug: 'the-bloom-tasting-box',
    description:
      'The ultimate introduction to Bloom by Pela: 2 packs of Plantain Chips, 1 Coconut Chips, 1 Chin Chin, plus 2 Fresh Juices (Tropical Bloom & Zobo).',
    pricePence: 2200,
    compareAtPricePence: 2600,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    productIds: ['prod-snack-plantain-chips', 'prod-snack-coconut-chips', 'prod-juice-tropical-bloom', 'prod-juice-zobo'],
    status: 'active',
  },
];

export const INITIAL_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
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

export const INITIAL_DELIVERY_AREAS: DeliveryArea[] = [
  { id: 'da-ne1', outwardCode: 'NE1', areaName: 'Newcastle City Centre', feePence: 350, minimumOrderPence: 1200, freeDeliveryThresholdPence: 3000, isActive: true },
  { id: 'da-ne2', outwardCode: 'NE2', areaName: 'Jesmond', feePence: 350, minimumOrderPence: 1200, freeDeliveryThresholdPence: 3000, isActive: true },
  { id: 'da-ne3', outwardCode: 'NE3', areaName: 'Gosforth', feePence: 350, minimumOrderPence: 1200, freeDeliveryThresholdPence: 3000, isActive: true },
  { id: 'da-ne4', outwardCode: 'NE4', areaName: 'Arthur\'s Hill, Fenham', feePence: 350, minimumOrderPence: 1200, freeDeliveryThresholdPence: 3000, isActive: true },
  { id: 'da-ne6', outwardCode: 'NE6', areaName: 'Heaton, Byker, Walker', feePence: 350, minimumOrderPence: 1200, freeDeliveryThresholdPence: 3000, isActive: true },
  { id: 'da-ne7', outwardCode: 'NE7', areaName: 'High Heaton, Benton', feePence: 350, minimumOrderPence: 1200, freeDeliveryThresholdPence: 3000, isActive: true },
  { id: 'da-ne8', outwardCode: 'NE8', areaName: 'Gateshead Central', feePence: 400, minimumOrderPence: 1500, freeDeliveryThresholdPence: 3500, isActive: true },
];
