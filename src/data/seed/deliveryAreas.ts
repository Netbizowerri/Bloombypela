// Seed delivery areas. `feePence` is the fresh-juice delivery fee (owner-set at
// £5.99 for every area); snack-only orders use snackFlatFeePence instead.
import type { DeliveryArea } from '../../types/delivery.js';

export const SEED_DELIVERY_AREAS: DeliveryArea[] = [
  { id: 'da-ne1', outwardCode: 'NE1', areaName: 'Newcastle City Centre', feePence: 599, minimumOrderPence: 1200, isActive: true },
  { id: 'da-ne2', outwardCode: 'NE2', areaName: 'Jesmond', feePence: 599, minimumOrderPence: 1200, isActive: true },
  { id: 'da-ne3', outwardCode: 'NE3', areaName: 'Gosforth', feePence: 599, minimumOrderPence: 1200, isActive: true },
  { id: 'da-ne4', outwardCode: 'NE4', areaName: "Arthur's Hill, Fenham", feePence: 599, minimumOrderPence: 1200, isActive: true },
  { id: 'da-ne6', outwardCode: 'NE6', areaName: 'Heaton, Byker, Walker', feePence: 599, minimumOrderPence: 1200, isActive: true },
  { id: 'da-ne7', outwardCode: 'NE7', areaName: 'High Heaton, Benton', feePence: 599, minimumOrderPence: 1200, isActive: true },
  { id: 'da-ne8', outwardCode: 'NE8', areaName: 'Gateshead Central', feePence: 599, minimumOrderPence: 1500, isActive: true },
];
